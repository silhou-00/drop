// Tests for the EWKB point parser against a known value and both byte orders.
import { describe, expect, it } from "vitest";
import { parseEwkbPoint } from "./geography.js";

describe("parseEwkbPoint", () => {
    it("parses a little-endian point with an SRID", () => {
        expect(parseEwkbPoint("0101000020E6100000000000000000F03F0000000000000040")).toEqual({ lng: 1, lat: 2 });
    });

    it("parses a big-endian point with an SRID", () => {
        expect(parseEwkbPoint("0020000001000010E63FF00000000000004000000000000000")).toEqual({ lng: 1, lat: 2 });
    });

    it("parses a point without an SRID", () => {
        expect(parseEwkbPoint("0101000000000000000000F03F0000000000000040")).toEqual({ lng: 1, lat: 2 });
    });

    it("rejects other geometry types", () => {
        expect(() => parseEwkbPoint("0102000020E6100000")).toThrow();
    });
});
