// Tests for the per-user limiter: the limit, the retry delay, the reset after the
// window, separate users and a custom window length.
import { describe, expect, it } from "vitest";
import { createUserLimiter } from "./user-limiter.js";

describe("createUserLimiter", () => {
    it("blocks the call over the limit with a 429 and the wait", () => {
        let now = 0;
        const limiter = createUserLimiter({ limit: 2, now: () => now });

        limiter.check("u1");
        limiter.check("u1");
        now = 10_000;

        expect(() => limiter.check("u1")).toThrowError(
            expect.objectContaining({ status: 429, code: "RATE_LIMITED", retryAfterSeconds: 50 }),
        );

        now = 60_000;

        expect(() => limiter.check("u1")).not.toThrow();
    });

    it("counts each user on their own", () => {
        const limiter = createUserLimiter({ limit: 1, now: () => 0 });

        limiter.check("u1");

        expect(() => limiter.check("u2")).not.toThrow();
        expect(() => limiter.check("u1")).toThrow();
    });

    it("uses the window length it is given", () => {
        let now = 0;
        const limiter = createUserLimiter({ limit: 1, windowMs: 900_000, now: () => now });

        limiter.check("u1");
        now = 60_000;

        expect(() => limiter.check("u1")).toThrowError(expect.objectContaining({ retryAfterSeconds: 840 }));

        now = 900_000;

        expect(() => limiter.check("u1")).not.toThrow();
    });
});
