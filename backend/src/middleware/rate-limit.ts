// Rate limiter for the API. Counts requests per client IP in a fixed window held in
// memory, so it resets on restart and is per instance.
import { getConnInfo } from "@hono/node-server/conninfo";
import type { MiddlewareHandler } from "hono";
import { createFixedWindow } from "../shared/fixed-window.js";

type Options = {
    limit?: number;
    windowMs?: number;
};

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

export function createRateLimiter({
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
}: Options = {}): MiddlewareHandler {
    const window = createFixedWindow({ limit, windowMs });

    return async (c, next) => {
        const ip = getConnInfo(c).remote.address ?? "unknown";

        const state = window.peek(ip);

        if (!state.allowed) {
            c.header("Retry-After", String(state.retryAfterSeconds));

            return c.json({ data: null, error: { code: "RATE_LIMITED", message: "Too many requests" } }, 429);
        }

        window.hit(ip);

        await next();
    };
}
