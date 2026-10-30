// Integration test against the Neon development database, run only when RUN_DB_TESTS=1.
// Checks the inbox queries for real: newest-first order, keyset paging across equal
// timestamps, the unread and photo filters, the unread count, mark read, delete returning the photo key, and that a foreign recipient
// can neither read, update nor delete. Cleans up its users (profiles and drops cascade).
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const run = process.env.RUN_DB_TESTS === "1";
const DB_TIMEOUT_MS = 30_000;
const SUFFIX = Date.now().toString(36);
const OWNER = `db-inbox-owner-${SUFFIX}`;
const STRANGER = `db-inbox-stranger-${SUFFIX}`;
const PHOTO_KEY = "123e4567-e89b-42d3-a456-426614174000.webp";

// round trips to Neon can exceed the 5 s default
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
        const service = createDropService({
            findOwnProfile: profiles.findByUserId,
            findRecipient: profiles.findByUsername,
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
        expect(await repo.countUnread(strangerId)).toBe(1);

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
    });
});
