// Integration test against the Neon development database, run only when RUN_DB_TESTS=1.
// Creates profiles that collide on username and on user, proves both are rejected, then cleans up.
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const run = process.env.RUN_DB_TESTS === "1";
const DB_TIMEOUT_MS = 30_000;

// round trips to Neon can exceed the 5 s default
describe.skipIf(!run)("createProfile against the database", { timeout: DB_TIMEOUT_MS }, () => {
    const userIds = ["db-test-user-a", "db-test-user-b"];
    const username = `dbtest_${Date.now().toString(36)}`;

    afterAll(async () => {
        const { db, closeDb } = await import("../shared/db/client.js");
        const { user } = await import("../auth/model.js");

        for (const id of userIds) {
            await db.delete(user).where(eq(user.id, id));
        }

        await closeDb();
    });

    it("answers USERNAME_TAKEN on the second create and PROFILE_EXISTS for the same user", async () => {
        const { db } = await import("../shared/db/client.js");
        const { user } = await import("../auth/model.js");
        const { createProfileRepository } = await import("./repository.js");
        const { createProfileService } = await import("./service.js");
        const service = createProfileService(createProfileRepository(db));

        for (const id of userIds) {
            await db.delete(user).where(eq(user.id, id));
        }

        await db.insert(user).values(userIds.map((id) => ({ id, name: id, email: `${id}@example.invalid` })));

        const input = { username, displayName: "Test" };
        const first = await service.createProfile(userIds[0], input);

        expect(first.username).toBe(username);

        await expect(
            service.createProfile(userIds[1], { ...input, username: username.toUpperCase() }),
        ).rejects.toMatchObject({ status: 409, code: "USERNAME_TAKEN" });
        await expect(service.createProfile(userIds[0], { ...input, username: `${username}x` })).rejects.toMatchObject({
            status: 409,
            code: "PROFILE_EXISTS",
        });
    });
});
