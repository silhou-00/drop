// Fixed-window counter held in memory. Callers peek at a key to see whether it has room,
// then hit it to count a request. Used by the API limiter and the send limiter. Resets on
// restart and is per instance. Expired windows are pruned on an unref'd timer.
type Options = {
    limit: number;
    windowMs: number;
    now?: () => number;
};

type Entry = {
    count: number;
    resetAt: number;
};

export type WindowState = {
    allowed: boolean;
    retryAfterSeconds: number;
};

export function createFixedWindow({ limit, windowMs, now = Date.now }: Options) {
    const entries = new Map<string, Entry>();

    // prune expired entries
    const timer = setInterval(() => {
        const current = now();

        for (const [key, entry] of entries) {
            if (entry.resetAt <= current) {
                entries.delete(key);
            }
        }
    }, windowMs);

    timer.unref();

    // read the state without counting
    function peek(key: string): WindowState {
        const entry = entries.get(key);
        const current = now();

        if (!entry || entry.resetAt <= current || entry.count < limit) {
            return { allowed: true, retryAfterSeconds: 0 };
        }

        return { allowed: false, retryAfterSeconds: Math.ceil((entry.resetAt - current) / 1000) };
    }

    // count one request
    function hit(key: string) {
        const current = now();
        let entry = entries.get(key);

        if (!entry || entry.resetAt <= current) {
            entry = { count: 0, resetAt: current + windowMs };
            entries.set(key, entry);
        }

        entry.count += 1;
    }

    return { peek, hit };
}
