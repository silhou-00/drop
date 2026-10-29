// Tests for the fixed window: counting, the retry delay, reset after the window, and
// separate keys.
import { describe, expect, it } from "vitest";
import { createFixedWindow } from "./fixed-window.js";

describe("createFixedWindow", () => {
    it("allows up to the limit then blocks with a retry delay", () => {
        let now = 0;
        const window = createFixedWindow({ limit: 2, windowMs: 10_000, now: () => now });

        window.hit("a");
        window.hit("a");
        now = 4_000;

        expect(window.peek("a")).toEqual({ allowed: false, retryAfterSeconds: 6 });
    });

    it("peek does not count", () => {
        const window = createFixedWindow({ limit: 1, windowMs: 10_000, now: () => 0 });

        window.peek("a");
        window.peek("a");

        expect(window.peek("a").allowed).toBe(true);
    });

    it("resets after the window", () => {
        let now = 0;
        const window = createFixedWindow({ limit: 1, windowMs: 10_000, now: () => now });

        window.hit("a");
        now = 10_000;

        expect(window.peek("a").allowed).toBe(true);
    });

    it("keeps keys apart", () => {
        const window = createFixedWindow({ limit: 1, windowMs: 10_000, now: () => 0 });

        window.hit("a");

        expect(window.peek("b").allowed).toBe(true);
    });
});
