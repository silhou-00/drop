// Integration test against a development database (never the live one), run only when RUN_DB_TESTS=1.
// Checks the inbox queries for real: newest-first order, keyset paging across equal
// timestamps, the unread and photo filters, the statement and earlier scopes (alone and
// with unread), the unread and earlier counts, the statements a page carries, mark read,
// delete returning the photo key, and that a foreign recipient can neither read, update
// nor delete, nor scope to another user's statement. Cleans up its users (profiles,
// statements and drops cascade).
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const run = process.env.RUN_DB_TESTS === "1";
const DB_TIMEOUT_MS = 30_000;
const SUFFIX = Date.now().toString(36);
const OWNER = `db-inbox-owner-${SUFFIX}`;
const STRANGER = `db-inbox-stranger-${SUFFIX}`;
const PHOTO_KEY = "123e4567-e89b-42d3-a456-426614174000.webp";

// round trips to the database can exceed the 5 s default
describe.skipIf(!run)("inbox against the database", { timeout: DB_TIMEOUT_MS }, () => {
    afterAll(async () => {
        const { db, closeDb } = await import("../shared/db/client.js");
        const { user } = await import("../auth/model.js");

        await db.delete(user).where(eq(user.id, OWNER));
        await db.delete(user).where(eq(user.id, STRANGER));
        await closeDb();
    });

    it("lists, pages, marks and deletes only the recipient's own drops", async () => {
        const { db } = await import("../shared/db/client.js");
        const { user } = await import("../auth/model.js");
        const { createProfileRepository } = await import("../profiles/repository.js");
        const { drops, inboxQuerySchema } = await import("./model.js");
        const { createDropRepository } = await import("./repository.js");
        const { statements } = await import("../statements/model.js");
        const { createStatementRepository } = await import("../statements/repository.js");
        const { createDropService } = await import("./service.js");
        const { createKeyMaker } = await import("./keys.js");
        const { createSendLimiter } = await import("./limits.js");

        const profiles = createProfileRepository(db);
        const ids: string[] = [];

        for (const [userId, name] of [
            [OWNER, `dbo_${SUFFIX}`],
            [STRANGER, `dbs_${SUFFIX}`],
        ] as const) {
            await db.delete(user).where(eq(user.id, userId));
            await db.insert(user).values({ id: userId, name: userId, email: `${userId}@example.invalid` });

            const created = await profiles.insertProfile({ userId, username: name, displayName: "Test" });

            if (!("profile" in created)) {
                throw new Error("profile not created");
            }

            ids.push(created.profile.id);
        }

        const [ownerId, strangerId] = ids;
        const base = {
            location: { lng: 120.9842, lat: 14.5995 },
            locationSource: "gps" as const,
            locationName: "Diliman",
            senderKey: "a".repeat(64),
            deviceKey: "b".repeat(64),
        };
        const t1 = new Date("2026-10-30T10:00:00.123456Z");
        const t2 = new Date("2026-10-30T11:00:00.000Z");

        // two drops share one timestamp to exercise the id tiebreak
        const inserted = await db
            .insert(drops)
            .values([
                { ...base, recipientId: ownerId, message: "old", createdAt: t1 },
                { ...base, recipientId: ownerId, message: "tie a", createdAt: t2 },
                { ...base, recipientId: ownerId, message: "tie b", createdAt: t2, photoKey: PHOTO_KEY },
                { ...base, recipientId: strangerId, message: "not yours", createdAt: t2, photoKey: PHOTO_KEY },
            ])
            .returning();
        const mine = inserted.filter((row) => row.recipientId === ownerId);
        const foreign = inserted.find((row) => row.recipientId === strangerId)!;
        const repo = createDropRepository(db);
        const statementRepo = createStatementRepository(db);
        const service = createDropService({
            findOwnProfile: profiles.findByUserId,
            findRecipient: profiles.findByUsername,
            findRunningStatementId: statementRepo.findRunningId,
            findStatementSummaries: statementRepo.summariesFor,
            drops: repo,
            limiter: createSendLimiter(),
            keys: createKeyMaker("s".repeat(40)),
            lookupPlaceName: async () => null,
            store: {
                save: async () => {},
                read: async () => Buffer.from("x"),
                remove: async () => {},
            },
            cleanPhoto: async (bytes) => bytes,
            newPhotoKey: () => PHOTO_KEY,
        });

        // order: time descending, then id descending
        const expected = [...mine].sort((a, b) => {
            return b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1);
        });
        const all = await service.listInbox(OWNER, inboxQuerySchema.parse({}));

        expect(all.items.map((item) => item.id)).toEqual(expected.map((row) => row.id));
        expect(all.next_cursor).toBeNull();
        expect(all.items[0].location).toEqual({ lat: 14.5995, lng: 120.9842, name: "Diliman", source: "gps" });

        // keyset paging one at a time, across the equal timestamps and microseconds
        const seen: string[] = [];
        let cursor: string | undefined;

        for (let page = 0; page < 5; page += 1) {
            const result = await service.listInbox(OWNER, inboxQuerySchema.parse({ limit: "1", cursor }));

            seen.push(...result.items.map((item) => item.id));

            if (!result.next_cursor) {
                break;
            }

            cursor = result.next_cursor;
        }

        expect(seen).toEqual(expected.map((row) => row.id));

        // mark read
        const target = mine[0];

        expect((await repo.setRead(ownerId, target.id, true))?.isRead).toBe(true);
        expect((await repo.findForRecipient(ownerId, target.id))?.isRead).toBe(true);

        // a foreign recipient cannot read, update or delete
        expect(await repo.findForRecipient(ownerId, foreign.id)).toBeNull();
        expect(await repo.setRead(ownerId, foreign.id, true)).toBeNull();
        expect(await repo.deleteForRecipient(ownerId, foreign.id)).toBeNull();
        expect(await repo.findForRecipient(strangerId, target.id)).toBeNull();
        expect(await repo.deleteForRecipient(strangerId, target.id)).toBeNull();
        expect((await repo.findForRecipient(strangerId, foreign.id))?.isRead).toBe(false);
        await expect(service.getDrop(OWNER, foreign.id)).rejects.toMatchObject({ status: 404 });

        // filters and the unread count, scoped to the owner
        const listIds = (filter: string, limit = "20", cursor?: string) => {
            return service.listInbox(OWNER, inboxQuerySchema.parse({ filter, limit, cursor }));
        };
        const ownUnread = mine.filter((row) => row.id !== target.id);
        const unreadPage = await listIds("unread");

        expect(unreadPage.items.map((item) => item.id).sort()).toEqual(ownUnread.map((row) => row.id).sort());
        expect(unreadPage.items.every((item) => !item.is_read)).toBe(true);
        expect(unreadPage.unread_count).toBe(ownUnread.length);
        expect((await listIds("all")).unread_count).toBe(ownUnread.length);
        expect((await repo.countInbox(strangerId)).unread).toBe(1);

        const photoPage = await listIds("photos");

        expect(photoPage.items.map((item) => item.id)).toEqual(mine.filter((row) => row.photoKey).map((row) => row.id));
        expect(photoPage.unread_count).toBe(ownUnread.length);

        // paging across the unread filter with the cursor
        const firstUnread = await listIds("unread", "1");
        const secondUnread = await listIds("unread", "1", firstUnread.next_cursor ?? undefined);
        const pagedIds = [...firstUnread.items, ...secondUnread.items].map((item) => item.id);

        expect(firstUnread.next_cursor).not.toBeNull();
        expect(secondUnread.next_cursor).toBeNull();
        expect(pagedIds.sort()).toEqual(ownUnread.map((row) => row.id).sort());

        // delete returns the photo key, then the drop is gone
        const withPhoto = mine.find((row) => row.photoKey)!;

        expect(await repo.deleteForRecipient(ownerId, withPhoto.id)).toEqual({ photoKey: PHOTO_KEY });
        expect(await repo.findForRecipient(ownerId, withPhoto.id)).toBeNull();
        expect(await repo.deleteForRecipient(ownerId, withPhoto.id)).toBeNull();

        // statements: one ended, one running, plus a foreign one
        const [ended] = await db
            .insert(statements)
            .values({
                profileId: ownerId,
                text: "Ended one",
                startedAt: sql`now() - interval '5 hours'`,
                endsAt: sql`now() - interval '3 hours'`,
                endedAt: sql`now() - interval '4 hours'`,
            })
            .returning();
        const running = await statementRepo.start(ownerId, "Running one");
        const foreignStatement = await statementRepo.start(strangerId, "Not yours");
        const filed = await db
            .insert(drops)
            .values([
                { ...base, recipientId: ownerId, message: "a1", statementId: ended.id },
                { ...base, recipientId: ownerId, message: "a2", statementId: ended.id, isRead: true },
                { ...base, recipientId: ownerId, message: "b1", statementId: running.id },
                { ...base, recipientId: strangerId, message: "f1", statementId: foreignStatement.id },
            ])
            .returning();
        const byMessage = (message: string) => filed.find((row) => row.message === message)!.id;
        const scoped = (statement: string, filter = "all") => {
            return service.listInbox(OWNER, inboxQuerySchema.parse({ statement, filter }));
        };

        // one statement, alone and with the unread chip
        const oneEnded = await scoped(ended.id);

        expect(oneEnded.items.map((item) => item.id).sort()).toEqual([byMessage("a1"), byMessage("a2")].sort());
        expect(oneEnded.items.every((item) => item.statement_id === ended.id)).toBe(true);
        expect((await scoped(ended.id, "unread")).items.map((item) => item.id)).toEqual([byMessage("a1")]);
        expect((await scoped(running.id)).items.map((item) => item.id)).toEqual([byMessage("b1")]);

        // earlier: only drops from before statements, and the count matches
        const earlier = await scoped("earlier");
        const earlierIds = earlier.items.map((item) => item.id);

        expect(earlierIds).not.toContain(byMessage("a1"));
        expect(earlierIds).toHaveLength(earlier.earlier_count);
        expect(earlier.earlier_count).toBeGreaterThan(0);
        expect((await scoped("earlier", "unread")).items.every((item) => item.statement_id === null)).toBe(true);

        // another user's statement gives an empty list and no section
        const foreignScope = await scoped(foreignStatement.id);

        expect(foreignScope.items).toEqual([]);
        expect(foreignScope.statements).toEqual([]);

        // sections on the page, newest statement first, with the totals
        const everything = await service.listInbox(OWNER, inboxQuerySchema.parse({}));

        expect(everything.statements.map((item) => item.id)).toEqual([running.id, ended.id]);
        expect(everything.statements[0]).toMatchObject({ running: true, drop_count: 1, ended_at: null });
        expect(everything.statements[1]).toMatchObject({ running: false, drop_count: 2 });
        expect(everything.statements[1].ended_at).not.toBeNull();
        expect(everything.earlier_count).toBe(earlier.earlier_count);

        // the scoped statement shows on an empty page
        const emptyChip = await scoped(running.id, "photos");

        expect(emptyChip.items).toEqual([]);
        expect(emptyChip.statements.map((item) => item.id)).toEqual([running.id]);
    });
});
