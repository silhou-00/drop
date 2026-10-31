// Per-user limiter. One fixed window per signed-in user id, one minute by default. It
// throws 429 with the wait in seconds when the window is full, which the error handler
// sends as Retry-After. Shared by the drops and statements routes.
import { AppError } from "./errors.js";
import { createFixedWindow } from "./fixed-window.js";

const MINUTE_MS = 60_000;

type Options = {
    limit: number;
    windowMs?: number;
    now?: () => number;
};

export function createUserLimiter({ limit, windowMs = MINUTE_MS, now }: Options) {
    const window = createFixedWindow({ limit, windowMs, now });

    function check(userId: string) {
        const state = window.peek(userId);

        if (!state.allowed) {
            throw new AppError(429, "RATE_LIMITED", "Too many requests", state.retryAfterSeconds);
        }

        window.hit(userId);
    }

    return { check };
}
