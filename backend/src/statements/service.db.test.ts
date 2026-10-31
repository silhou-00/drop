// Integration test against the Neon development database, run only when RUN_DB_TESTS=1.
// Checks statements for real: the exact two-hour length, that a second start closes the
// first, that two starts at once leave one open row, ending early and ending twice, a
// statement past its end time closing at its true end time, and the drop counts, which
// ignore other users. Cleans up its users (profiles, statements and drops cascade).
import { eq, isNull, and, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const run = process.env.RUN_DB_TESTS === "1";
const DB_TIMEOUT_MS = 30_000;
const SUFFIX = Date.now().toString(36);
const OWNER = `db-stmt-owner-${SUFFIX}`;
const OTHER = `db-stmt-other-${SUFFIX}`;
const RACER = `db-stmt-racer-${SUFFIX}`;

// round trips to Neon can exceed the 5 s default
describe.skipIf(!run)("statements against the database", { timeout: DB_TIMEOUT_MS }, () => {
    afterAll(async () => {
        const { db, closeDb } = await import("../shared/db/client.js");
        const { user } = await import("../auth/model.js");

        for (const id of [OWNER, OTHER, RACER]) {
            await db.delete(user).where(eq(user.id, id));
        }

        await closeDb();
    });

    it("starts, replaces, ends, expires and counts", async () => {
        const { db } = await import("../shared/db/client.js");
        const { user } = await import("../auth/model.js");
        const { drops } = await import("../drops/model.js");
        const { createProfileRepository } = await import("../profiles/repository.js");
        const { statements } = await import("./model.js");
        const { createStatementRepository } = await import("./repository.js");
        const { createStatementService } = await import("./service.js");

        const profiles = createProfileRepository(db);
        const repo = createStatementRepository(db);
        const ids: string[] = [];

        for (const [userId, name] of [
            [OWNER, `dso_${SUFFIX}`],
            [OTHER, `dst_${SUFFIX}`],
            [RACER, `dsr_${SUFFIX}`],
        ] as const) {
            await db.delete(user).where(eq(user.id, userId));
            await db.insert(user).values({ id: userId, name: userId, email: `${userId}@example.invalid` });

            const created = await profiles.insertProfile({ userId, username: name, displayName: "Test" });

            if (!("profile" in created)) {
                throw new Error("profile not created");
            }

            ids.push(created.profile.id);
        }

        const [ownerId, otherId, racerId] = ids;
        const service = createStatementService({ findOwnProfile: profiles.findByUserId, statements: repo });
        const openRows = async (profileId: string) => {
            return db
                .select()
                .from(statements)
                .where(and(eq(statements.profileId, profileId), isNull(statements.endedAt)));
        };

        // the length is exactly two hours on one clock
        const first = await repo.start(ownerId, "First");
        const [length] = await db
            .select({ seconds: sql<number>`extract(epoch from ${statements.endsAt} - ${statements.startedAt})::int` })
            .from(statements)
            .where(eq(statements.id, first.id));

        expect(length.seconds).toBe(7200);
        expect(first).toMatchObject({ running: true, dropCount: 0, endedAt: null });
        expect(first.secondsLeft).toBeGreaterThan(7190);
        expect(first.secondsLeft).toBeLessThanOrEqual(7200);

        // a second start closes the first
        const second = await repo.start(ownerId, "Second");
        const [closed] = await db.select().from(statements).where(eq(statements.id, first.id));

        expect(closed.endedAt).not.toBeNull();
        expect((await openRows(ownerId)).map((row) => row.id)).toEqual([second.id]);
        expect((await repo.findRunning(ownerId))?.id).toBe(second.id);
        expect(await repo.findRunningId(ownerId)).toBe(second.id);

        // two starts at once leave exactly one open row and no error
        const results = await Promise.all([repo.start(racerId, "One"), repo.start(racerId, "Two")]);

        expect(results).toHaveLength(2);
        expect(await openRows(racerId)).toHaveLength(1);

        // ending early, then ending again
        const ended = await service.endStatement(OWNER, second.id);

        expect(ended).toMatchObject({ id: second.id, running: false });
        expect(ended.ended_at).not.toBeNull();
        expect(await repo.findRunning(ownerId)).toBeNull();
        await expect(service.endStatement(OWNER, second.id)).rejects.toMatchObject({
            status: 409,
            code: "STATEMENT_ENDED",
        });

        // another user's statement and an unknown id are both missing
        const theirs = await repo.start(otherId, "Theirs");

        expect(await repo.end(ownerId, theirs.id)).toEqual({ status: "missing" });
        await expect(service.endStatement(OWNER, theirs.id)).rejects.toMatchObject({ status: 404 });
        expect((await repo.findRunning(otherId))?.id).toBe(theirs.id);

        // a statement past its end time is not running, and the next start closes it at its end time
        const [expired] = await db
            .insert(statements)
            .values({
                profileId: ownerId,
                text: "Expired",
                startedAt: sql`now() - interval '3 hours'`,
                endsAt: sql`now() - interval '1 hour'`,
            })
            .returning();

        expect(await repo.findRunning(ownerId)).toBeNull();
        expect(await repo.findRunningId(ownerId)).toBeNull();
        expect(await repo.end(ownerId, expired.id)).toEqual({ status: "not-running" });

        const third = await repo.start(ownerId, "Third");
        const [reclosed] = await db.select().from(statements).where(eq(statements.id, expired.id));

        expect(reclosed.endedAt?.getTime()).toBe(reclosed.endsAt.getTime());
        expect((await openRows(ownerId)).map((row) => row.id)).toEqual([third.id]);

        // drop counts per statement, ignoring other users
        const base = {
            location: { lng: 120.9842, lat: 14.5995 },
            locationSource: "gps" as const,
            senderKey: "a".repeat(64),
        };

        await db.insert(drops).values([
            { ...base, recipientId: ownerId, message: "1", statementId: second.id },
            { ...base, recipientId: ownerId, message: "2", statementId: second.id },
            { ...base, recipientId: ownerId, message: "3", statementId: third.id },
            { ...base, recipientId: otherId, message: "4", statementId: theirs.id },
        ]);

        const summaries = await repo.summariesFor(ownerId, [second.id, third.id, theirs.id, first.id]);

        expect(summaries.map((row) => row.id)).toEqual([third.id, second.id, first.id]);
        expect(summaries.map((row) => row.dropCount)).toEqual([1, 2, 0]);
        expect(await repo.summariesFor(ownerId, [])).toEqual([]);
        expect((await repo.findRunning(ownerId))?.dropCount).toBe(1);
        expect(await service.getCurrent(OWNER)).toMatchObject({ statement: { id: third.id, drop_count: 1 } });

        // deleting a statement leaves its drops in place with a null link
        await db.delete(statements).where(eq(statements.id, second.id));

        const [orphan] = await db
            .select()
            .from(drops)
            .where(and(eq(drops.recipientId, ownerId), eq(drops.message, "1")));

        expect(orphan.statementId).toBeNull();
    });
});
