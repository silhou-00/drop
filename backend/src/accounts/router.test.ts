// Tests for DELETE /me against a fake service and a fake session: sign-in required, a
// foreign Origin refused, the 422 messages, the body size limit, the 204 with the copied
// Set-Cookie and no-store, and the per-user limit with Retry-After.
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createSessionMiddleware, type AppEnv, type GetSession } from "../middleware/session.js";
import { AppError, errorHandler } from "../shared/errors.js";
import { CONFIRM_MESSAGE } from "./model.js";
import { createAccountRouter } from "./router.js";
import type { AccountService } from "./service.js";

const ORIGIN = "http://localhost:5173";

const signedIn = (async () => ({ user: { id: "u1" }, session: { id: "s1" } })) as unknown as GetSession;
const signedOut: GetSession = async () => null;

const service: AccountService = {
    deleteAccount: async (_user, input) => {
        if (input.username === "ghost") {
            throw new AppError(404, "NOT_FOUND", "Not found");
        }
    },
};

const clearSession = async () => {
    const headers = new Headers();

    headers.append("Set-Cookie", "better-auth.session_token=; Max-Age=0; Path=/");
    headers.append("Set-Cookie", "better-auth.session_data=; Max-Age=0; Path=/");

    return headers;
};

function build(getSession: GetSession = signedIn, limit?: number) {
    const app = new Hono<AppEnv>();

    app.onError(errorHandler);
    app.use("/api/*", createSessionMiddleware(getSession));
    app.route("/api/v1", createAccountRouter(service, { origin: ORIGIN, clearSession, limit }));

    return app;
}

function remove(app: Hono<AppEnv>, body: unknown, headers: Record<string, string> = {}) {
    return app.request("/api/v1/me", {
        method: "DELETE",
        headers: { Origin: ORIGIN, "Content-Type": "application/json", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
}

async function errorOf(res: Response) {
    return ((await res.json()) as { error: { code: string; message: string } }).error;
}

describe("DELETE /me", () => {
    it("answers 401 when signed out", async () => {
        const res = await remove(build(signedOut), { username: "maya" });

        expect(res.status).toBe(401);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("answers 403 for a foreign Origin and for no Origin", async () => {
        const app = build();
        const foreign = await remove(app, { username: "maya" }, { Origin: "https://evil.example" });
        const none = await app.request("/api/v1/me", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "maya" }),
        });

        expect(foreign.status).toBe(403);
        expect(none.status).toBe(403);
    });

    it("answers 422 for a non-JSON body, an extra field, and an empty or long name", async () => {
        const app = build(signedIn, 50);

        for (const body of [
            { username: "" },
            { username: "a".repeat(31) },
            { username: "maya", extra: 1 },
            {},
            "{no",
        ]) {
            const res = await remove(app, body);

            expect(res.status).toBe(422);
            expect(await errorOf(res)).toEqual({ code: "VALIDATION_ERROR", message: CONFIRM_MESSAGE });
        }

        const plain = await remove(app, "username=maya", { "Content-Type": "text/plain" });

        expect(plain.status).toBe(422);
        expect((await errorOf(plain)).message).toBe(CONFIRM_MESSAGE);
    });

    it("answers 413 for a body over 1 KB", async () => {
        const res = await remove(build(), { username: "maya", pad: "x".repeat(2048) });

        expect(res.status).toBe(413);
        expect((await errorOf(res)).code).toBe("PAYLOAD_TOO_LARGE");
    });

    it("passes a 404 from the service through", async () => {
        const res = await remove(build(), { username: "ghost" });

        expect(res.status).toBe(404);
    });

    it("answers 204 with the copied Set-Cookie headers and no-store", async () => {
        const res = await remove(build(), { username: " Maya " });

        expect(res.status).toBe(204);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(res.headers.getSetCookie()).toHaveLength(2);
        expect(res.headers.getSetCookie()[0]).toContain("better-auth.session_token=");
    });

    it("answers 429 with Retry-After on the call past the limit", async () => {
        const app = build(signedIn, 5);

        for (let call = 0; call < 5; call += 1) {
            expect((await remove(app, { username: "maya" })).status).toBe(204);
        }

        const res = await remove(app, { username: "maya" });

        expect(res.status).toBe(429);
        expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
        expect((await errorOf(res)).code).toBe("RATE_LIMITED");
    });
});
