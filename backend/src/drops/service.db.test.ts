// Integration test against a development database (never the live one), run only when RUN_DB_TESTS=1.
// Inserts a drop with a rounded location, checks the stored point, that the drop is filed
// under the running statement, the closed answer when no statement is running, has ended
// or has run out, the 48-hour place-name window, and a drop with a photo key, then cleans up.
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";

const run = process.env.RUN_DB_TESTS === "1";
const DB_TIMEOUT_MS = 30_000;

// round trips to the database can exceed the 5 s default
describe.skipIf(!run)("sending a drop against the database", { timeout: DB_TIMEOUT_MS }, () => {
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

    it("stores the cell centre, files the drop under the running statement, refuses a closed link, and respects the cache window", async () => {
        const { db } = await import("../shared/db/client.js");
        const { user } = await import("../auth/model.js");
        const { createStatementRepository } = await import("../statements/repository.js");
        const { statements } = await import("../statements/model.js");
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
            photoKey: null,
            senderKey: "a".repeat(64),
            deviceKey: "b".repeat(64),
        };

        const statementRepo = createStatementRepository(db);

        // no statement running: the link is closed
        expect(await repo.insertDrop(row)).toBe("closed");

        // insert with a location, under the running statement
        const first = await statementRepo.start(recipientId, "Out tonight");

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

        const filed = await db
            .select({ statementId: drops.statementId })
            .from(drops)
            .where(eq(drops.recipientId, recipientId));

        expect(filed[0].statementId).toBe(first.id);

        // a drop sent with a photo stores its key and a clean WebP file
        const uploads = await mkdtemp(path.join(tmpdir(), "drop-db-uploads-"));

        try {
            const { createKeyMaker } = await import("./keys.js");
            const { createSendLimiter } = await import("./limits.js");
            const { createDropService } = await import("./service.js");
            const { cleanPhoto, newPhotoKey } = await import("../photos/service.js");
            const { createLocalDiskStore } = await import("../shared/storage/local-disk.js");
            const service = createDropService({
                findOwnProfile: createProfileRepository(db).findByUserId,
                findRecipient: createProfileRepository(db).findByUsername,
                findRunningStatementId: statementRepo.findRunningId,
                findStatementSummaries: statementRepo.summariesFor,
                drops: repo,
                limiter: createSendLimiter(),
                keys: createKeyMaker("s".repeat(40)),
                lookupPlaceName: async () => null,
                store: createLocalDiskStore({ dir: uploads }),
                cleanPhoto,
                newPhotoKey,
            });
            const jpeg = await sharp({ create: { width: 300, height: 200, channels: 3, background: "teal" } })
                .jpeg()
                .withExif({ IFD3: { GPSLatitudeRef: "N" } })
                .toBuffer();

            await db.delete(drops).where(eq(drops.recipientId, recipientId));
            await service.sendDrop({
                username,
                ip: "203.0.113.9",
                deviceId: "d".repeat(43),
                fields: {
                    message: "with photo",
                    latitude: "14.599512",
                    longitude: "120.984222",
                    location_source: "gps",
                    photo: new File([new Uint8Array(jpeg)], "a.jpg", { type: "image/jpeg" }),
                },
            });

            const [withPhoto] = await db
                .select({ photoKey: drops.photoKey })
                .from(drops)
                .where(eq(drops.recipientId, recipientId));
            const files = await readdir(uploads);

            expect(files).toEqual([withPhoto.photoKey]);

            const meta = await sharp(await readFile(path.join(uploads, files[0]))).metadata();

            expect(meta.format).toBe("webp");
            expect(meta.exif).toBeUndefined();
        } finally {
            await rm(uploads, { recursive: true, force: true });
            await db.delete(drops).where(eq(drops.recipientId, recipientId));
        }

        // an ended statement closes the link
        expect((await statementRepo.end(recipientId, first.id)).status).toBe("ended");
        expect(await repo.insertDrop(row)).toBe("closed");

        // a statement past its end time closes the link without any job
        await db.insert(statements).values({
            profileId: recipientId,
            text: "Expired",
            startedAt: sql`now() - interval '3 hours'`,
            endsAt: sql`now() - interval '1 hour'`,
        });

        expect(await statementRepo.findRunning(recipientId)).toBeNull();
        expect(await repo.insertDrop(row)).toBe("closed");

        // a new statement opens it again, and a missing profile is reported
        const second = await statementRepo.start(recipientId, "Back again");

        expect(await repo.insertDrop(row)).toBe("inserted");
        expect(await repo.insertDrop({ ...row, recipientId: "00000000-0000-0000-0000-000000000000" })).toBe("missing");

        const [latest] = await db
            .select({ statementId: drops.statementId })
            .from(drops)
            .where(eq(drops.statementId, second.id));

        expect(latest.statementId).toBe(second.id);

        // the database refuses a drop without a location
        await expect(
            db.execute(
                sql`insert into drops (recipient_id, message, sender_key) values (${recipientId}, 'x', ${"a".repeat(64)})`,
            ),
        ).rejects.toThrow();

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
