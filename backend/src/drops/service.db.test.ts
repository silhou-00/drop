// Integration test against the Neon development database, run only when RUN_DB_TESTS=1.
// Inserts a drop with a rounded location, checks the stored point, the pause check, and
// the 48-hour place-name window, then cleans up.
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const run = process.env.RUN_DB_TESTS === "1";

describe.skipIf(!run)("sending a drop against the database", () => {
    const userId = "db-test-drop-user";
    const username = `dbdrop_${Date.now().toString(36)}`;
    const cellKey = `test:${Date.now()}`;

    afterAll(async () => {
        const { db, closeDb } = await import("../shared/db/client.js");
        const { user } = await import("../auth/model.js");
        const { placeNames } = await import("../places/model.js");

        await db.delete(user).where(eq(user.id, userId));
        await db.delete(placeNames).where(eq(placeNames.cellKey, cellKey));
        await closeDb();
    });

    it("stores the cell centre, refuses a paused profile, and respects the cache window", async () => {
        const { db } = await import("../shared/db/client.js");
        const { user } = await import("../auth/model.js");
        const { profiles } = await import("../profiles/model.js");
        const { createProfileRepository } = await import("../profiles/repository.js");
        const { createPlaceRepository } = await import("../places/repository.js");
        const { placeNames } = await import("../places/model.js");
        const { drops } = await import("./model.js");
        const { createDropRepository } = await import("./repository.js");
        const { snapToGrid } = await import("../shared/geo.js");

        await db.delete(user).where(eq(user.id, userId));
        await db.insert(user).values({ id: userId, name: userId, email: `${userId}@example.invalid` });

        const profile = await createProfileRepository(db).insertProfile({ userId, username, displayName: "Test" });

        if (!("profile" in profile)) {
            throw new Error("profile not created");
        }

        const recipientId = profile.profile.id;
        const repo = createDropRepository(db);
        const cell = snapToGrid(14.599512, 120.984222);
        const row = {
            recipientId,
            message: "hi",
            location: { lng: cell.lng, lat: cell.lat },
            locationSource: "gps" as const,
            locationName: null,
            senderKey: "a".repeat(64),
            deviceKey: "b".repeat(64),
        };

        // insert with a location
        expect(await repo.insertDrop(row)).toBe("inserted");

        const stored = await db
            .select({
                lng: sql<number>`ST_X(${drops.location}::geometry)`,
                lat: sql<number>`ST_Y(${drops.location}::geometry)`,
            })
            .from(drops)
            .where(eq(drops.recipientId, recipientId));

        expect(stored).toHaveLength(1);
        expect(Number(stored[0].lat)).toBeCloseTo(cell.lat, 6);
        expect(Number(stored[0].lng)).toBeCloseTo(cell.lng, 6);

        // paused profile
        await db.update(profiles).set({ acceptingDrops: false }).where(eq(profiles.id, recipientId));

        expect(await repo.insertDrop(row)).toBe("paused");
        expect(await repo.insertDrop({ ...row, recipientId: "00000000-0000-0000-0000-000000000000" })).toBe("missing");

        // 48 hour cache window
        const places = createPlaceRepository(db);

        await places.upsert(cellKey, "Diliman");

        expect(await places.findFresh(cellKey)).toEqual({ name: "Diliman" });

        await db
            .update(placeNames)
            .set({ fetchedAt: sql`now() - interval '49 hours'` })
            .where(eq(placeNames.cellKey, cellKey));

        expect(await places.findFresh(cellKey)).toBeNull();

        await places.deleteExpired();

        const left = await db.select().from(placeNames).where(eq(placeNames.cellKey, cellKey));

        expect(left).toHaveLength(0);
    });
});
