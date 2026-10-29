// Tests for the send service with fakes: the order of the checks, what reaches the
// repository, and the place-name fallback.
import { describe, expect, it } from "vitest";
import { createKeyMaker } from "./keys.js";
import { createSendLimiter } from "./limits.js";
import type { NewDropRow } from "./repository.js";
import { createDropService } from "./service.js";

const keys = createKeyMaker("s".repeat(40));
const recipient = { id: "r1", acceptingDrops: true };

type Options = {
    recipient?: typeof recipient | null;
    result?: "inserted" | "paused" | "missing";
    placeName?: string | null;
};

function build({
    recipient: found = recipient,
    result = "inserted",
    placeName = "Diliman, Quezon City",
}: Options = {}) {
    const rows: NewDropRow[] = [];
    const lookups: unknown[] = [];
    const service = createDropService({
        findRecipient: async () => found,
        drops: {
            insertDrop: async (row) => {
                rows.push(row);

                return result;
            },
        },
        limiter: createSendLimiter(),
        keys,
        lookupPlaceName: async (cell) => {
            lookups.push(cell);

            return placeName;
        },
    });

    return { service, rows, lookups };
}

const base = { username: "maya", ip: "203.0.113.7", deviceId: "d".repeat(43) };

describe("sendDrop", () => {
    it("answers 404 for an unknown or invalid name", async () => {
        await expect(
            build({ recipient: null }).service.sendDrop({ ...base, fields: { message: "hi" } }),
        ).rejects.toMatchObject({
            status: 404,
        });
        await expect(
            build().service.sendDrop({ ...base, username: "ab", fields: { message: "hi" } }),
        ).rejects.toMatchObject({ status: 404 });
    });

    it("answers 409 before the limit and before validation", async () => {
        const { service } = build({ recipient: { id: "r1", acceptingDrops: false } });

        for (let i = 0; i < 10; i += 1) {
            await expect(service.sendDrop({ ...base, fields: {} })).rejects.toMatchObject({
                status: 409,
                code: "LINK_PAUSED",
            });
        }
    });

    it("applies the limit before validation", async () => {
        const { service } = build();

        for (let i = 0; i < 5; i += 1) {
            await expect(service.sendDrop({ ...base, fields: {} })).rejects.toMatchObject({ status: 422 });
        }

        await expect(service.sendDrop({ ...base, fields: {} })).rejects.toMatchObject({ status: 429 });
    });

    it("answers 422 with the first message", async () => {
        await expect(build().service.sendDrop({ ...base, fields: { message: "" } })).rejects.toMatchObject({
            status: 422,
            code: "VALIDATION_ERROR",
            message: "Write a message up to 280 characters.",
        });
    });

    it("sends only the snapped point and the right keys to the repository", async () => {
        const { service, rows } = build();
        const result = await service.sendDrop({
            ...base,
            fields: { message: "hi", latitude: "14.599512", longitude: "120.984222", location_source: "gps" },
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

    it("stores a drop with no location and skips the place lookup", async () => {
        const { service, rows, lookups } = build();

        await service.sendDrop({ ...base, fields: { message: "hi" } });

        expect(rows[0]).toMatchObject({ location: null, locationSource: null, locationName: null });
        expect(lookups).toHaveLength(0);
    });

    it("stores a null name when the place lookup has none", async () => {
        const { service, rows } = build({ placeName: null });

        await service.sendDrop({
            ...base,
            fields: { message: "hi", latitude: "1", longitude: "2", location_source: "manual" },
        });

        expect(rows[0].locationName).toBeNull();
    });

    it("answers 409 when the pause lands at insert time, and 404 when the profile is gone", async () => {
        await expect(
            build({ result: "paused" }).service.sendDrop({ ...base, fields: { message: "hi" } }),
        ).rejects.toMatchObject({ status: 409, code: "LINK_PAUSED" });
        await expect(
            build({ result: "missing" }).service.sendDrop({ ...base, fields: { message: "hi" } }),
        ).rejects.toMatchObject({ status: 404 });
    });
});
