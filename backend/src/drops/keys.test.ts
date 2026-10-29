// Tests for the sender and device keys: stable keyed hashes, IP normalization, and
// separation between IP keys and device keys.
import { describe, expect, it } from "vitest";
import { createKeyMaker, normalizeIp } from "./keys.js";

const secret = "a".repeat(40);

describe("createKeyMaker", () => {
    const keys = createKeyMaker(secret);

    it("returns 64 hex characters, stable across calls", () => {
        expect(keys.senderKey("203.0.113.7")).toMatch(/^[0-9a-f]{64}$/);
        expect(keys.senderKey("203.0.113.7")).toBe(keys.senderKey("203.0.113.7"));
    });

    it("depends on the secret", () => {
        expect(createKeyMaker("b".repeat(40)).senderKey("203.0.113.7")).not.toBe(keys.senderKey("203.0.113.7"));
    });

    it("treats an IPv4-mapped address as the IPv4 address", () => {
        expect(keys.senderKey("::ffff:203.0.113.7")).toBe(keys.senderKey("203.0.113.7"));
    });

    it("matches addresses in the same /64 and splits other /64s", () => {
        expect(keys.senderKey("2001:db8:1:2::1")).toBe(keys.senderKey("2001:db8:1:2:ffff::9"));
        expect(keys.senderKey("2001:db8:1:2::1")).not.toBe(keys.senderKey("2001:db8:1:3::1"));
    });

    it("keeps ip and device keys separate", () => {
        expect(keys.senderKey("x")).not.toBe(keys.deviceKey("x"));
    });
});

describe("normalizeIp", () => {
    it("leaves IPv4 alone and reduces IPv6 to its /64", () => {
        expect(normalizeIp("203.0.113.7")).toBe("203.0.113.7");
        expect(normalizeIp("2001:DB8:1:2:3:4:5:6")).toBe("2001:0db8:0001:0002::/64");
    });
});
