// Rate limiter for the API. Counts requests per client IP in a fixed window held in
// memory, so it resets on restart and is per instance. Old entries are pruned on a timer.
import { getConnInfo } from "@hono/node-server/conninfo";
import type { MiddlewareHandler } from "hono";

type Options = {
    limit?: number;
    windowMs?: number;
};

type Entry = {
    count: number;
    resetAt: number;
};

const DEFAULT_LIMIT = 60;
const DEFAULT_WINDOW_MS = 60_000;

export function createRateLimiter({
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
}: Options = {}): MiddlewareHandler {
    const entries = new Map<string, Entry>();

    // prune expired entries
    const timer = setInterval(() => {
        const now = Date.now();

        for (const [ip, entry] of entries) {
            if (entry.resetAt <= now) {
                entries.delete(ip);
            }
        }
    }, windowMs);

    timer.unref();

    return async (c, next) => {
        const ip = getConnInfo(c).remote.address ?? "unknown";
        const now = Date.now();
        let entry = entries.get(ip);

        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            entries.set(ip, entry);
        }

        entry.count += 1;

        if (entry.count > limit) {
            c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));

            return c.json({ data: null, error: { code: "RATE_LIMITED", message: "Too many requests" } }, 429);
        }

        await next();
    };
}
