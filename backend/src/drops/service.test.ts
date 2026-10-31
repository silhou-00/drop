// Tests for the send service with fakes: the order of the checks (the closed link comes
// before the limits), what reaches the repository, the place-name fallback, and the
// photo save and cleanup order.
import { describe, expect, it } from "vitest";
import { createKeyMaker } from "./keys.js";
import { createSendLimiter } from "./limits.js";
import type { NewDropRow } from "./repository.js";
import { PHOTO_MAX_BYTES, PHOTO_MESSAGE } from "../photos/model.js";
import { AppError } from "../shared/errors.js";
import { LOCATION_REQUIRED_MESSAGE } from "./model.js";
import { createDropService } from "./service.js";

const PHOTO_KEY = "123e4567-e89b-42d3-a456-426614174000.webp";
const photo = new File([new Uint8Array([1, 2, 3])], "a.jpg", { type: "image/jpeg" });

const keys = createKeyMaker("s".repeat(40));
const recipient = { id: "r1" };

type Options = {
    recipient?: typeof recipient | null;
    result?: "inserted" | "closed" | "missing";
    running?: boolean;
    placeName?: string | null;
    insertError?: Error;
    cleanError?: Error;
};

function build({
    recipient: found = recipient,
    result = "inserted",
    running = true,
    placeName = "Diliman, Quezon City",
    insertError,
    cleanError,
}: Options = {}) {
    const rows: NewDropRow[] = [];
    const lookups: unknown[] = [];
    const saved: string[] = [];
    const removed: string[] = [];
    const service = createDropService({
        findOwnProfile: async () => null,
        findRecipient: async () => found,
        findRunningStatementId: async () => (running ? "s1" : null),
        findStatementSummaries: async () => [],
        drops: {
            listForRecipient: async () => [],
            countInbox: async () => ({ unread: 0, earlier: 0 }),
            findForRecipient: async () => null,
            setRead: async () => null,
            deleteForRecipient: async () => null,
            insertDrop: async (row) => {
                rows.push(row);

                if (insertError) {
                    throw insertError;
                }

                return result;
            },
        },
        limiter: createSendLimiter(),
        keys,
        lookupPlaceName: async (cell) => {
            lookups.push(cell);

            return placeName;
        },
        store: {
            save: async (key) => {
                saved.push(key);
            },
            read: async () => Buffer.alloc(0),
            remove: async (key) => {
                removed.push(key);
            },
        },
        cleanPhoto: async () => {
            if (cleanError) {
                throw cleanError;
            }

            return Buffer.from("cleaned");
        },
        newPhotoKey: () => PHOTO_KEY,
    });

    return { service, rows, lookups, saved, removed };
}

const gps = { latitude: "14.599512", longitude: "120.984222", location_source: "gps" };
const base = { username: "maya", ip: "203.0.113.7", deviceId: "d".repeat(43) };

describe("sendDrop", () => {
    it("answers 404 for an unknown or invalid name", async () => {
        await expect(
            build({ recipient: null }).service.sendDrop({ ...base, fields: { message: "hi", ...gps } }),
        ).rejects.toMatchObject({
            status: 404,
        });
        await expect(
            build().service.sendDrop({ ...base, username: "ab", fields: { message: "hi", ...gps } }),
        ).rejects.toMatchObject({ status: 404 });
    });

    it("answers 409 LINK_CLOSED before the limit and before validation", async () => {
        const { service, rows } = build({ running: false });

        for (let i = 0; i < 10; i += 1) {
            await expect(service.sendDrop({ ...base, fields: {} })).rejects.toMatchObject({
                status: 409,
                code: "LINK_CLOSED",
                message: "This link is not taking drops right now.",
            });
        }

        expect(rows).toHaveLength(0);
    });

    it("answers 422 for a statement_id sent by the client", async () => {
        const { service, rows } = build();

        await expect(
            service.sendDrop({ ...base, fields: { message: "hi", ...gps, statement_id: "s9" } }),
        ).rejects.toMatchObject({ status: 422, code: "VALIDATION_ERROR" });
        expect(rows).toHaveLength(0);
    });

    it("applies the limit before validation", async () => {
        const { service } = build();

        for (let i = 0; i < 5; i += 1) {
            await expect(service.sendDrop({ ...base, fields: {} })).rejects.toMatchObject({ status: 422 });
        }

        await expect(service.sendDrop({ ...base, fields: {} })).rejects.toMatchObject({ status: 429 });
    });

    it("answers 422 with the first message", async () => {
        await expect(build().service.sendDrop({ ...base, fields: { message: "", ...gps } })).rejects.toMatchObject({
            status: 422,
            code: "VALIDATION_ERROR",
            message: "Write a message up to 280 characters.",
        });
    });

    it("sends only the snapped point and the right keys to the repository", async () => {
        const { service, rows } = build();
        const result = await service.sendDrop({
            ...base,
            fields: { message: "hi", ...gps },
        });

        expect(result).toEqual({ delivered: true });
        expect(rows).toHaveLength(1);
        expect(rows[0].location).not.toEqual({ lat: 14.599512, lng: 120.984222 });
        expect(Math.abs((rows[0].location?.lat ?? 0) - 14.599512)).toBeLessThan(0.001);
        expect(rows[0]).toMatchObject({
            recipientId: "r1",
            message: "hi",
            locationSource: "gps",
            locationName: "Diliman, Quezon City",
            senderKey: keys.senderKey(base.ip),
            deviceKey: keys.deviceKey(base.deviceId),
        });
    });

    it("answers 422 with the location message when the location is missing, partial or manual", async () => {
        const cases = [
            { message: "hi" },
            { message: "hi", latitude: "1" },
            { message: "hi", latitude: "1", longitude: "2" },
            { message: "hi", latitude: "1", longitude: "2", location_source: "manual" },
        ];

        for (const fields of cases) {
            const { service, rows } = build();

            await expect(service.sendDrop({ ...base, fields })).rejects.toMatchObject({
                status: 422,
                code: "VALIDATION_ERROR",
                message: LOCATION_REQUIRED_MESSAGE,
            });
            expect(rows).toHaveLength(0);
        }
    });

    it("stores a null name when the place lookup has none", async () => {
        const { service, rows } = build({ placeName: null });

        await service.sendDrop({
            ...base,
            fields: { message: "hi", ...gps },
        });

        expect(rows[0].locationName).toBeNull();
    });

    it("answers 409 when the statement ends at insert time, and 404 when the profile is gone", async () => {
        await expect(
            build({ result: "closed" }).service.sendDrop({ ...base, fields: { message: "hi", ...gps } }),
        ).rejects.toMatchObject({ status: 409, code: "LINK_CLOSED" });
        await expect(
            build({ result: "missing" }).service.sendDrop({ ...base, fields: { message: "hi", ...gps } }),
        ).rejects.toMatchObject({ status: 404 });
    });

    it("sends no photo: nothing is saved and the key is null", async () => {
        const { service, rows, saved } = build();

        await service.sendDrop({ ...base, fields: { message: "hi", ...gps } });

        expect(saved).toEqual([]);
        expect(rows[0].photoKey).toBeNull();
    });

    it("cleans and saves a photo, and passes its key to the insert", async () => {
        const { service, rows, saved, removed } = build();

        await service.sendDrop({ ...base, fields: { message: "hi", ...gps, photo } });

        expect(saved).toEqual([PHOTO_KEY]);
        expect(removed).toEqual([]);
        expect(rows[0].photoKey).toBe(PHOTO_KEY);
    });

    it("removes the saved photo and answers 409 when the insert returns closed", async () => {
        const { service, saved, removed } = build({ result: "closed" });

        await expect(service.sendDrop({ ...base, fields: { message: "hi", ...gps, photo } })).rejects.toMatchObject({
            status: 409,
        });
        expect(saved).toEqual([PHOTO_KEY]);
        expect(removed).toEqual([PHOTO_KEY]);
    });

    it("removes the saved photo and answers 404 when the insert returns missing", async () => {
        const { service, removed } = build({ result: "missing" });

        await expect(service.sendDrop({ ...base, fields: { message: "hi", ...gps, photo } })).rejects.toMatchObject({
            status: 404,
        });
        expect(removed).toEqual([PHOTO_KEY]);
    });

    it("removes the saved photo and rethrows when the insert throws", async () => {
        const failure = new Error("db down");
        const { service, removed } = build({ insertError: failure });

        await expect(service.sendDrop({ ...base, fields: { message: "hi", ...gps, photo } })).rejects.toBe(failure);
        expect(removed).toEqual([PHOTO_KEY]);
    });

    it("answers 422 and saves nothing when the photo cannot be cleaned", async () => {
        const { service, saved, rows } = build({ cleanError: new AppError(422, "VALIDATION_ERROR", PHOTO_MESSAGE) });

        await expect(service.sendDrop({ ...base, fields: { message: "hi", ...gps, photo } })).rejects.toMatchObject({
            status: 422,
            message: PHOTO_MESSAGE,
        });
        expect(saved).toEqual([]);
        expect(rows).toHaveLength(0);
    });

    it("answers 422 for a photo that is a string, a list, empty or too big", async () => {
        const empty = new File([], "a.jpg");
        const big = new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], "a.jpg");

        for (const bad of ["text", [photo, photo], empty, big]) {
            const { service, saved } = build();

            await expect(
                service.sendDrop({ ...base, fields: { message: "hi", ...gps, photo: bad } }),
            ).rejects.toMatchObject({ status: 422, message: PHOTO_MESSAGE });
            expect(saved).toEqual([]);
        }
    });
});
