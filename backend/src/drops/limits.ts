// Drop limits. Three fixed windows guard the public send endpoint: per IP, per device,
// and per device and recipient. A send is counted only when all three have room, and
// only hashed keys are held in memory. A per-user window guards the inbox routes.
import { AppError } from "../shared/errors.js";
import { createFixedWindow } from "../shared/fixed-window.js";

type Options = {
    now?: () => number;
};

export type SendLimitInput = {
    senderKey: string;
    deviceKey: string;
    recipientId: string;
};

const HOUR_MS = 3_600_000;
const QUARTER_HOUR_MS = 900_000;
const IP_LIMIT = 60;
const DEVICE_LIMIT = 30;
const DEVICE_RECIPIENT_LIMIT = 5;

export function createSendLimiter({ now }: Options = {}) {
    const ip = createFixedWindow({ limit: IP_LIMIT, windowMs: HOUR_MS, now });
    const device = createFixedWindow({ limit: DEVICE_LIMIT, windowMs: HOUR_MS, now });
    const deviceRecipient = createFixedWindow({ limit: DEVICE_RECIPIENT_LIMIT, windowMs: QUARTER_HOUR_MS, now });

    // throws 429 when any window is full, otherwise counts the send in all three
    function check({ senderKey, deviceKey, recipientId }: SendLimitInput) {
        const pairKey = `${deviceKey}:${recipientId}`;
        const states = [ip.peek(senderKey), device.peek(deviceKey), deviceRecipient.peek(pairKey)];
        const blocked = states.filter((state) => !state.allowed);

        if (blocked.length > 0) {
            const retryAfter = Math.max(...blocked.map((state) => state.retryAfterSeconds));

            throw new AppError(429, "RATE_LIMITED", "Too many requests", retryAfter);
        }

        ip.hit(senderKey);
        device.hit(deviceKey);
        deviceRecipient.hit(pairKey);
    }

    return { check };
}

const MINUTE_MS = 60_000;

// one window per signed-in user id; throws 429 with the wait when it is full
export function createUserLimiter({ limit, now }: { limit: number; now?: () => number }) {
    const window = createFixedWindow({ limit, windowMs: MINUTE_MS, now });

    function check(userId: string) {
        const state = window.peek(userId);

        if (!state.allowed) {
            throw new AppError(429, "RATE_LIMITED", "Too many requests", state.retryAfterSeconds);
        }

        window.hit(userId);
    }

    return { check };
}

export type SendLimiter = ReturnType<typeof createSendLimiter>;
