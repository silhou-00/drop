// Tests for the send input rules: message length in code points, coordinates, the
// required GPS location, unknown fields, and multipart array values.
import { describe, expect, it } from "vitest";
import { LOCATION_MESSAGE, LOCATION_REQUIRED_MESSAGE, MESSAGE_MESSAGE, sendDropSchema } from "./model.js";

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
});
