// Tests for the drop input rules: message length in code points, coordinates, the
// required GPS location, unknown fields, multipart array values, the optional photo,
// and the inbox query (page size, filter, statement scope, cursor), read body and the
// statement id on the inbox item.
import { describe, expect, it } from "vitest";
import { PHOTO_MAX_BYTES, PHOTO_MESSAGE } from "../photos/model.js";
import {
    CURSOR_MESSAGE,
    FILTER_MESSAGE,
    LIMIT_MESSAGE,
    LOCATION_MESSAGE,
    LOCATION_REQUIRED_MESSAGE,
    MESSAGE_MESSAGE,
    STATEMENT_FILTER_MESSAGE,
    encodeCursor,
    inboxQuerySchema,
    readBodySchema,
    sendDropSchema,
    toInboxItem,
} from "./model.js";

function firstMessage(input: unknown) {
    const result = sendDropSchema.safeParse(input);

    return result.success ? null : result.error.issues[0]?.message;
}

const gps = { latitude: "14.5995", longitude: "120.9842", location_source: "gps" };

describe("sendDropSchema", () => {
    it("trims the message", () => {
        expect(sendDropSchema.parse({ message: "  hi  ", ...gps }).message).toBe("hi");
    });

    it("counts code points, so 280 emoji pass and 281 fail", () => {
        expect(sendDropSchema.safeParse({ message: "\u{1F600}".repeat(280), ...gps }).success).toBe(true);
        expect(firstMessage({ message: "\u{1F600}".repeat(281), ...gps })).toBe(MESSAGE_MESSAGE);
    });

    it("rejects an empty message after trimming, and NUL", () => {
        expect(firstMessage({ message: "   ", ...gps })).toBe(MESSAGE_MESSAGE);
        expect(firstMessage({ message: "a\u0000b" })).toBe(MESSAGE_MESSAGE);
        expect(firstMessage({ ...gps })).toBe(MESSAGE_MESSAGE);
    });

    it("parses a full location into numbers", () => {
        expect(
            sendDropSchema.parse({
                message: "hi",
                latitude: "14.5995",
                longitude: "-120.9842",
                location_source: "gps",
            }),
        ).toEqual({ message: "hi", latitude: 14.5995, longitude: -120.9842, location_source: "gps" });
    });

    it("requires a location: missing, partial, or not from GPS", () => {
        expect(firstMessage({ message: "hi" })).toBe(LOCATION_REQUIRED_MESSAGE);
        expect(firstMessage({ message: "hi", latitude: "14.5" })).toBe(LOCATION_REQUIRED_MESSAGE);
        expect(firstMessage({ message: "hi", location_source: "gps" })).toBe(LOCATION_REQUIRED_MESSAGE);
        expect(firstMessage({ message: "hi", latitude: "1", longitude: "2" })).toBe(LOCATION_REQUIRED_MESSAGE);
        expect(firstMessage({ message: "hi", latitude: "1", longitude: "2", location_source: "manual" })).toBe(
            LOCATION_REQUIRED_MESSAGE,
        );
        expect(firstMessage({ message: "hi", latitude: "1", longitude: "2", location_source: "ip" })).toBe(
            LOCATION_REQUIRED_MESSAGE,
        );
    });

    it("rejects out of range and malformed coordinates", () => {
        const base = { message: "hi", location_source: "gps" };

        expect(firstMessage({ ...base, latitude: "91", longitude: "0" })).toBe(LOCATION_MESSAGE);
        expect(firstMessage({ ...base, latitude: "0", longitude: "181" })).toBe(LOCATION_MESSAGE);
        expect(firstMessage({ ...base, latitude: "abc", longitude: "0" })).toBe(LOCATION_MESSAGE);
        expect(firstMessage({ ...base, latitude: "1e2", longitude: "0" })).toBe(LOCATION_MESSAGE);
    });

    it("rejects unknown fields and array values", () => {
        expect(sendDropSchema.safeParse({ message: "hi", ...gps, extra: "x" }).success).toBe(false);
        expect(sendDropSchema.safeParse({ message: ["a", "b"], ...gps }).success).toBe(false);
    });

    it("accepts a file photo within the size bounds, or none", () => {
        const base = { message: "hi", ...gps };

        expect(sendDropSchema.safeParse(base).success).toBe(true);
        expect(sendDropSchema.safeParse({ ...base, photo: new File([new Uint8Array(1)], "a.jpg") }).success).toBe(true);
        expect(
            sendDropSchema.safeParse({ ...base, photo: new File([new Uint8Array(PHOTO_MAX_BYTES)], "a.jpg") }).success,
        ).toBe(true);
    });

    it("rejects a photo that is a string, a list, empty or over the cap", () => {
        const base = { message: "hi", ...gps };
        const file = new File([new Uint8Array(1)], "a.jpg");
        const bad = [
            "text",
            [file, file],
            new File([], "a.jpg"),
            new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], "a.jpg"),
        ];

        for (const photo of bad) {
            expect(firstMessage({ ...base, photo })).toBe(PHOTO_MESSAGE);
        }
    });
});

describe("inboxQuerySchema", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const at = "2026-10-30T12:00:00.123456Z";
    const cursor = encodeCursor({ createdAt: at, id });

    function messageOf(input: unknown) {
        const result = inboxQuerySchema.safeParse(input);

        return result.success ? null : result.error.issues[0]?.message;
    }

    it("defaults the page size to 20 and accepts 1 to 50", () => {
        expect(inboxQuerySchema.parse({}).limit).toBe(20);
        expect(inboxQuerySchema.parse({ limit: "1" }).limit).toBe(1);
        expect(inboxQuerySchema.parse({ limit: "50" }).limit).toBe(50);
    });

    it("rejects a page size outside 1 to 50 or not a whole number", () => {
        for (const limit of ["0", "51", "-1", "2.5", "abc", "", "1e1", "0012x"]) {
            expect(messageOf({ limit })).toBe(LIMIT_MESSAGE);
        }
    });

    it("round trips a cursor", () => {
        expect(inboxQuerySchema.parse({ cursor }).cursor).toEqual({ createdAt: at, id });
    });

    it("rejects a malformed, oversized or tampered cursor", () => {
        const bad = [
            "not a cursor!",
            "a".repeat(200),
            Buffer.from("nope").toString("base64url"),
            Buffer.from(`${at}|not-a-uuid`).toString("base64url"),
            Buffer.from(`2026-13-45T99:00:00.123456Z|${id}`).toString("base64url"),
            Buffer.from(`${at}|${id}|extra`).toString("base64url"),
            Buffer.from(`2026-10-30T12:00:00Z|${id}`).toString("base64url"),
        ];

        for (const value of bad) {
            expect(messageOf({ cursor: value })).toBe(CURSOR_MESSAGE);
        }
    });

    it("rejects unknown query fields", () => {
        expect(inboxQuerySchema.safeParse({ sort: "id" }).success).toBe(false);
        expect(inboxQuerySchema.safeParse({ filter: "all", sort: "id" }).success).toBe(false);
    });

    it("defaults the filter to all and accepts all, unread and photos", () => {
        expect(inboxQuerySchema.parse({}).filter).toBe("all");

        for (const filter of ["all", "unread", "photos"]) {
            expect(inboxQuerySchema.parse({ filter }).filter).toBe(filter);
        }
    });

    it("rejects any other filter with the filter message", () => {
        for (const filter of ["pins", "", "UNREAD"]) {
            expect(messageOf({ filter })).toBe(FILTER_MESSAGE);
        }
    });

    it("accepts a statement id or earlier, and leaves the scope out by default", () => {
        expect(inboxQuerySchema.parse({}).statement).toBeUndefined();
        expect(inboxQuerySchema.parse({ statement: id }).statement).toBe(id);
        expect(inboxQuerySchema.parse({ statement: "earlier" }).statement).toBe("earlier");
    });

    it("rejects any other statement value with the statement message", () => {
        for (const statement of ["", "all", "EARLIER", "not-a-uuid", `${id}x`]) {
            expect(messageOf({ statement })).toBe(STATEMENT_FILTER_MESSAGE);
        }
    });
});

describe("toInboxItem", () => {
    const row = {
        id: "11111111-1111-4111-8111-111111111111",
        recipientId: "22222222-2222-4222-8222-222222222222",
        message: "hi",
        location: { lng: 120.9842, lat: 14.5995 },
        locationSource: "gps" as const,
        locationName: null,
        photoKey: null,
        statementId: null,
        senderKey: "a".repeat(64),
        deviceKey: null,
        isRead: false,
        createdAt: new Date("2026-10-30T12:00:00.000Z"),
    };

    it("carries the statement id, null for a drop from before statements", () => {
        expect(toInboxItem(row).statement_id).toBeNull();
        expect(toInboxItem({ ...row, statementId: "33333333-3333-4333-8333-333333333333" }).statement_id).toBe(
            "33333333-3333-4333-8333-333333333333",
        );
    });
});

describe("readBodySchema", () => {
    it("accepts only a boolean is_read", () => {
        expect(readBodySchema.parse({ is_read: false })).toEqual({ is_read: false });
        expect(readBodySchema.safeParse({ is_read: "true" }).success).toBe(false);
        expect(readBodySchema.safeParse({}).success).toBe(false);
        expect(readBodySchema.safeParse({ is_read: true, message: "x" }).success).toBe(false);
    });
});
