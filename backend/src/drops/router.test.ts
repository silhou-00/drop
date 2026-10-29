// Tests for the send route against a fake service: the envelope, the device cookie,
// the origin check, content type, body size, and the Retry-After header on 429.
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createDeviceCookie } from "../middleware/device-cookie.js";
import type { AppEnv } from "../middleware/session.js";
import { AppError, errorHandler } from "../shared/errors.js";
import { createDropRouter } from "./router.js";
import type { DropService, SendDropRequest } from "./service.js";

const ORIGIN = "http://localhost:5173";
const nodeEnv = { incoming: { socket: { remoteAddress: "203.0.113.7" } } };
const VALID_ID = "A".repeat(43);

function build(sendDrop: DropService["sendDrop"]) {
    const app = new Hono<AppEnv>();

    app.onError(errorHandler);
    app.use("/api/v1/profiles/*", createDeviceCookie({ secure: false }));
    app.route("/api/v1", createDropRouter({ sendDrop }, { origin: ORIGIN }));

    return app;
}

function post(app: Hono<AppEnv>, init: { body?: FormData | string; headers?: Record<string, string> } = {}) {
    const form = new FormData();

    form.set("message", "hi");

    return app.request(
        "/api/v1/profiles/maya/drops",
        { method: "POST", body: init.body ?? form, headers: { Origin: ORIGIN, ...init.headers } },
        nodeEnv,
    );
}

const ok: DropService["sendDrop"] = async () => ({ delivered: true });

describe("POST /profiles/:username/drops", () => {
    it("returns 201 in the envelope with no-store", async () => {
        const res = await post(build(ok));

        expect(res.status).toBe(201);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(await res.json()).toEqual({ data: { delivered: true }, error: null });
    });

    it("passes the username, ip, device id and fields to the service", async () => {
        let seen: SendDropRequest | undefined;
        const app = build(async (request) => {
            seen = request;

            return { delivered: true };
        });

        await post(app, { headers: { Cookie: `drop_device=${VALID_ID}` } });

        expect(seen).toEqual({ username: "maya", ip: "203.0.113.7", deviceId: VALID_ID, fields: { message: "hi" } });
    });

    it("sets the device cookie on the first request", async () => {
        const res = await post(build(ok));
        const cookie = res.headers.get("Set-Cookie") ?? "";

        expect(cookie).toContain("drop_device=");
        expect(cookie).toContain("HttpOnly");
        expect(cookie).toContain("SameSite=Lax");
        expect(cookie).toContain("Path=/");
    });

    it("keeps a valid cookie and replaces a malformed one", async () => {
        const kept = await post(build(ok), { headers: { Cookie: `drop_device=${VALID_ID}` } });
        const replaced = await post(build(ok), { headers: { Cookie: "drop_device=short" } });

        expect(kept.headers.get("Set-Cookie")).toBeNull();
        expect(replaced.headers.get("Set-Cookie")).toContain("drop_device=");
    });

    it("rejects a foreign Origin with 403 in the envelope", async () => {
        const res = await post(build(ok), { headers: { Origin: "https://evil.example" } });

        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ data: null, error: { code: "FORBIDDEN", message: "Request not allowed" } });
    });

    it("rejects a JSON body with 422", async () => {
        const res = await post(build(ok), {
            body: JSON.stringify({ message: "hi" }),
            headers: { "Content-Type": "application/json" },
        });
        const json = (await res.json()) as { error: { code: string } };

        expect(res.status).toBe(422);
        expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects a body over 16 KB with 413", async () => {
        const form = new FormData();

        form.set("message", "a".repeat(17 * 1024));

        const res = await post(build(ok), { body: form });

        expect(res.status).toBe(413);
    });

    it("sets Retry-After when the service answers 429", async () => {
        const res = await post(
            build(async () => {
                throw new AppError(429, "RATE_LIMITED", "Too many requests", 42);
            }),
        );

        expect(res.status).toBe(429);
        expect(res.headers.get("Retry-After")).toBe("42");
    });
});
