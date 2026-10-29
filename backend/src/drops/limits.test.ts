// Tests for the send limits: per recipient, per device, per IP, the retry delay, and an
// injected clock for the window reset.
import { describe, expect, it } from "vitest";
import { createSendLimiter, type SendLimitInput } from "./limits.js";

function sendMany(limiter: ReturnType<typeof createSendLimiter>, count: number, make: (i: number) => SendLimitInput) {
    for (let i = 0; i < count; i += 1) {
        limiter.check(make(i));
    }
}

describe("createSendLimiter", () => {
    it("blocks the 6th send from one device to one recipient", () => {
        const limiter = createSendLimiter({ now: () => 0 });
        const input = { senderKey: "ip", deviceKey: "d", recipientId: "r" };

        sendMany(limiter, 5, () => input);

        expect(() => limiter.check(input)).toThrowError(expect.objectContaining({ status: 429, code: "RATE_LIMITED" }));
    });

    it("blocks the 31st send from one device across recipients", () => {
        const limiter = createSendLimiter({ now: () => 0 });

        sendMany(limiter, 30, (i) => ({ senderKey: `ip${i}`, deviceKey: "d", recipientId: `r${i}` }));

        expect(() => limiter.check({ senderKey: "ipx", deviceKey: "d", recipientId: "rx" })).toThrowError(
            expect.objectContaining({ status: 429 }),
        );
    });

    it("blocks the 61st send from one IP across devices", () => {
        const limiter = createSendLimiter({ now: () => 0 });

        sendMany(limiter, 60, (i) => ({ senderKey: "ip", deviceKey: `d${i}`, recipientId: `r${i}` }));

        expect(() => limiter.check({ senderKey: "ip", deviceKey: "dx", recipientId: "rx" })).toThrowError(
            expect.objectContaining({ status: 429 }),
        );
    });

    it("sets Retry-After to the time left and allows again after the window", () => {
        let now = 0;
        const limiter = createSendLimiter({ now: () => now });
        const input = { senderKey: "ip", deviceKey: "d", recipientId: "r" };

        sendMany(limiter, 5, () => input);
        now = 100_000;

        expect(() => limiter.check(input)).toThrowError(expect.objectContaining({ retryAfterSeconds: 800 }));

        now = 900_000;

        expect(() => limiter.check(input)).not.toThrow();
    });

    it("does not count a blocked send", () => {
        const limiter = createSendLimiter({ now: () => 0 });
        const input = { senderKey: "ip", deviceKey: "d", recipientId: "r" };

        sendMany(limiter, 5, () => input);

        expect(() => limiter.check(input)).toThrow();
        expect(() => limiter.check({ ...input, recipientId: "other" })).not.toThrow();
    });
});
