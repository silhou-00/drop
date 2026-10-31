// Integration test against the Neon development database, run only when RUN_DB_TESTS=1.
// Seeds a user with a session, an auth account, a profile, statements and drops (one with
// a photo file), then proves a wrong name deletes nothing, the right name removes every
// row and the file, the name is held for 30 days, a concurrent send leaves no drop, and
// an expired hold is pruned on the next claim. Cleans up everything it created.
import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq, inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const run = process.env.RUN_DB_TESTS === "1";
const DB_TIMEOUT_MS = 60_000;

// round trips to Neon can exceed the 5 s default
describe.skipIf(!run)("deleting an account against the database", { timeout: DB_TIMEOUT_MS }, () => {
    const stamp = Date.now().toString(36);
    const userIds = [`db-test-del-a-${stamp}`, `db-test-del-b-${stamp}`, `db-test-del-c-${stamp}`];
    const username = `dbdel_${stamp}`;
    const raceName = `dbrace_${stamp}`;

    afterAll(async () => {
        const { db, closeDb } = await import("../shared/db/client.js");
        const { user } = await import("../auth/model.js");
        const { usernameHolds } = await import("../profiles/model.js");

        await db.delete(user).where(inArray(user.id, userIds));
        await db.delete(usernameHolds).where(inArray(usernameHolds.username, [username, raceName]));
        await closeDb();
    });

    it("removes everything, holds the name, and survives a concurrent send", async () => {
        const { db } = await import("../shared/db/client.js");
        const { user, session, account } = await import("../auth/model.js");
        const { drops } = await import("../drops/model.js");
        const { createDropRepository } = await import("../drops/repository.js");
        const { createProfileRepository } = await import("../profiles/repository.js");
        const { profiles, usernameHolds } = await import("../profiles/model.js");
        const { createStatementRepository } = await import("../statements/repository.js");
        const { statements } = await import("../statements/model.js");
        const { createLocalDiskStore } = await import("../shared/storage/local-disk.js");
        const { createAccountRepository } = await import("./repository.js");
        const { createAccountService } = await import("./service.js");

        const uploads = await mkdtemp(path.join(tmpdir(), "drop-db-delete-"));

        try {
            await db.delete(user).where(inArray(user.id, userIds));
            await db.insert(user).values(userIds.map((id) => ({ id, name: id, email: `${id}@example.invalid` })));

            const profileRepo = createProfileRepository(db);
            const created = await profileRepo.insertProfile({ userId: userIds[0], username, displayName: "Test" });

            if (!("profile" in created)) {
                throw new Error("profile not created");
            }

            const profileId = created.profile.id;
            const statementRepo = createStatementRepository(db);
            const dropRepo = createDropRepository(db);
            const store = createLocalDiskStore({ dir: uploads });

            await db.insert(session).values({
                id: `s-${stamp}`,
                token: `t-${stamp}`,
                userId: userIds[0],
                expiresAt: new Date(Date.now() + 60_000),
                updatedAt: new Date(),
            });
            await db.insert(account).values({
                id: `a-${stamp}`,
                accountId: userIds[0],
                providerId: "email-otp",
                userId: userIds[0],
                updatedAt: new Date(),
            });

            const ended = await statementRepo.start(profileId, "Out tonight");

            await statementRepo.end(profileId, ended.id);
            await statementRepo.start(profileId, "Again");

            const row = {
                recipientId: profileId,
                message: "hi",
                location: { lng: 120.98, lat: 14.6 },
                locationSource: "gps" as const,
                locationName: null,
                photoKey: null as string | null,
                senderKey: "a".repeat(64),
                deviceKey: "b".repeat(64),
            };

            const photoKey = `${randomUUID()}.webp`;

            await writeFile(path.join(uploads, photoKey), Buffer.from("x"));
            await dropRepo.insertDrop(row);
            await dropRepo.insertDrop({ ...row, photoKey });

            const service = createAccountService({ accounts: createAccountRepository(db), store });

            // a wrong name deletes nothing
            await expect(service.deleteAccount(userIds[0], { username: "wrong" })).rejects.toMatchObject({
                status: 422,
            });

            expect(await db.select().from(profiles).where(eq(profiles.id, profileId))).toHaveLength(1);
            expect(await readdir(uploads)).toEqual([photoKey]);

            // the right name removes every row and the file
            await service.deleteAccount(userIds[0], { username: username.toUpperCase() });

            expect(await db.select().from(user).where(eq(user.id, userIds[0]))).toHaveLength(0);
            expect(await db.select().from(session).where(eq(session.userId, userIds[0]))).toHaveLength(0);
            expect(await db.select().from(account).where(eq(account.userId, userIds[0]))).toHaveLength(0);
            expect(await db.select().from(profiles).where(eq(profiles.id, profileId))).toHaveLength(0);
            expect(await db.select().from(drops).where(eq(drops.recipientId, profileId))).toHaveLength(0);
            expect(await db.select().from(statements).where(eq(statements.profileId, profileId))).toHaveLength(0);
            expect(await readdir(uploads)).toEqual([]);

            // a second delete finds no profile
            await expect(service.deleteAccount(userIds[0], { username })).rejects.toMatchObject({ status: 404 });

            // the name is held for about 30 days
            const [hold] = await db.select().from(usernameHolds).where(eq(usernameHolds.username, username));
            const days = (hold.releasedAt.getTime() - Date.now()) / 86_400_000;

            expect(days).toBeGreaterThan(29.9);
            expect(days).toBeLessThanOrEqual(30);

            const claim = await profileRepo.insertProfile({ userId: userIds[1], username, displayName: "Other" });

            expect(claim).toEqual({ conflict: "username" });

            // after the hold expires the claim works and the hold is pruned
            await db
                .update(usernameHolds)
                .set({ releasedAt: sql`now() - interval '1 minute'` })
                .where(eq(usernameHolds.username, username));

            const later = await profileRepo.insertProfile({ userId: userIds[1], username, displayName: "Other" });

            expect("profile" in later).toBe(true);
            expect(await db.select().from(usernameHolds).where(eq(usernameHolds.username, username))).toHaveLength(0);

            // a send racing a delete leaves no drop behind
            const raced = await profileRepo.insertProfile({ userId: userIds[2], username: raceName, displayName: "R" });

            if (!("profile" in raced)) {
                throw new Error("profile not created");
            }

            await statementRepo.start(raced.profile.id, "Racing");

            await Promise.allSettled([
                dropRepo.insertDrop({ ...row, recipientId: raced.profile.id }),
                service.deleteAccount(userIds[2], { username: raceName }),
            ]);

            expect(await db.select().from(drops).where(eq(drops.recipientId, raced.profile.id))).toHaveLength(0);
            expect(await db.select().from(user).where(eq(user.id, userIds[2]))).toHaveLength(0);
        } finally {
            await rm(uploads, { recursive: true, force: true });
        }
    });
});
