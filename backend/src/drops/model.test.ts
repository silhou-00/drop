// Tests for the send input rules: message length in code points, coordinates, the
// location pair, unknown fields, and multipart array values.
import { describe, expect, it } from "vitest";
import { LOCATION_MESSAGE, MESSAGE_MESSAGE, sendDropSchema } from "./model.js";

function firstMessage(input: unknown) {
    const result = sendDropSchema.safeParse(input);

    return result.success ? null : result.error.issues[0]?.message;
}

describe("sendDropSchema", () => {
    it("accepts a message alone", () => {
        expect(sendDropSchema.parse({ message: "  hi  " })).toEqual({ message: "hi" });
    });

    it("counts code points, so 280 emoji pass and 281 fail", () => {
        expect(sendDropSchema.safeParse({ message: "\u{1F600}".repeat(280) }).success).toBe(true);
        expect(firstMessage({ message: "\u{1F600}".repeat(281) })).toBe(MESSAGE_MESSAGE);
    });

    it("rejects an empty message after trimming, and NUL", () => {
        expect(firstMessage({ message: "   " })).toBe(MESSAGE_MESSAGE);
        expect(firstMessage({ message: "a\u0000b" })).toBe(MESSAGE_MESSAGE);
        expect(firstMessage({})).toBe(MESSAGE_MESSAGE);
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

    it("rejects a single coordinate, a source alone, and a location without a source", () => {
        expect(firstMessage({ message: "hi", latitude: "14.5" })).toBe(LOCATION_MESSAGE);
        expect(firstMessage({ message: "hi", location_source: "gps" })).toBe(LOCATION_MESSAGE);
        expect(firstMessage({ message: "hi", latitude: "1", longitude: "2" })).toBe(LOCATION_MESSAGE);
    });

    it("rejects out of range, malformed and unknown source values", () => {
        const base = { message: "hi", location_source: "gps" };

        expect(firstMessage({ ...base, latitude: "91", longitude: "0" })).toBe(LOCATION_MESSAGE);
        expect(firstMessage({ ...base, latitude: "0", longitude: "181" })).toBe(LOCATION_MESSAGE);
        expect(firstMessage({ ...base, latitude: "abc", longitude: "0" })).toBe(LOCATION_MESSAGE);
        expect(firstMessage({ ...base, latitude: "1e2", longitude: "0" })).toBe(LOCATION_MESSAGE);
        expect(firstMessage({ message: "hi", latitude: "1", longitude: "2", location_source: "ip" })).toBe(
            LOCATION_MESSAGE,
        );
    });

    it("rejects unknown fields and array values", () => {
        expect(sendDropSchema.safeParse({ message: "hi", extra: "x" }).success).toBe(false);
        expect(sendDropSchema.safeParse({ message: ["a", "b"] }).success).toBe(false);
    });
});
