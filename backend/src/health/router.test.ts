// Tests for the health routes and the rate limiter, run against stand-in database
// handles so no real database is needed.
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../middleware/rate-limit.js";
import { createHealthRouter } from "./router.js";
import { createHealthService } from "./service.js";

const nodeEnv = { incoming: { socket: { remoteAddress: "203.0.113.7" } } };

function buildApp(execute: () => Promise<unknown>, limit = 60) {
    const app = new Hono();

    app.use("/api/*", createRateLimiter({ limit, windowMs: 60_000 }));
    app.route("/api/v1", createHealthRouter(createHealthService({ execute }).checkDatabase));

    return app;
}

describe("health routes", () => {
    it("returns the health envelope", async () => {
        const app = buildApp(async () => []);
        const res = await app.request("/api/v1/health", {}, nodeEnv);

        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(await res.json()).toEqual({ data: { status: "ok" }, error: null });
    });

    it("returns ready when the database answers", async () => {
        const app = buildApp(async () => []);
        const res = await app.request("/api/v1/ready", {}, nodeEnv);

        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(await res.json()).toEqual({ data: { status: "ready" }, error: null });
    });

    it("returns 503 with no database detail when the database fails", async () => {
        const app = buildApp(async () => {
            throw Object.assign(new Error("secret host db.internal refused"), { code: "ECONNREFUSED" });
        });
        const res = await app.request("/api/v1/ready", {}, nodeEnv);
        const text = await res.text();

        expect(res.status).toBe(503);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(JSON.parse(text)).toEqual({ data: null, error: { code: "NOT_READY", message: "Not ready" } });
        expect(text).not.toContain("secret");
        expect(text).not.toContain("ECONNREFUSED");
    });
});

describe("rate limiter", () => {
    it("returns 429 with Retry-After after the limit", async () => {
        const app = buildApp(async () => [], 3);

        for (let i = 0; i < 3; i += 1) {
            const ok = await app.request("/api/v1/health", {}, nodeEnv);

            expect(ok.status).toBe(200);
        }

        const res = await app.request("/api/v1/health", {}, nodeEnv);

        expect(res.status).toBe(429);
        expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
        expect(await res.json()).toEqual({
            data: null,
            error: { code: "RATE_LIMITED", message: "Too many requests" },
        });
    });
});
