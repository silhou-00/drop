// Tests for the statement routes against a fake service and a fake session: sign-in
// required, a foreign Origin refused, the body size limit, the 422 messages, the 201 and
// 200 bodies, no-store on every response, and the write limit with Retry-After.
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createSessionMiddleware, type AppEnv, type GetSession } from "../middleware/session.js";
import { AppError, errorHandler } from "../shared/errors.js";
import { END_BODY_MESSAGE, STATEMENT_ENDED_MESSAGE, STATEMENT_MESSAGE, type Statement } from "./model.js";
import { createStatementRouter } from "./router.js";
import type { StatementService } from "./service.js";

const ORIGIN = "http://localhost:5173";
const ID = "11111111-1111-4111-8111-111111111111";

const statement: Statement = {
    id: ID,
    text: "Out tonight",
    started_at: "2026-10-31T10:00:00.000Z",
    ends_at: "2026-10-31T12:00:00.000Z",
    ended_at: null,
    running: true,
    seconds_left: 7200,
    drop_count: 0,
};

const signedIn = (async () => ({ user: { id: "u1" }, session: { id: "s1" } })) as unknown as GetSession;
const signedOut: GetSession = async () => null;

const service: StatementService = {
    startStatement: async (_user, input) => ({ ...statement, text: input.text }),
    endStatement: async (_user, id) => {
        if (id === "gone") {
            throw new AppError(409, "STATEMENT_ENDED", STATEMENT_ENDED_MESSAGE);
        }

        return { ...statement, running: false };
    },
    getCurrent: async () => ({ statement: null }),
};

type Limits = { readLimit?: number; writeLimit?: number };

function build(getSession: GetSession = signedIn, limits: Limits = {}) {
    const app = new Hono<AppEnv>();

    app.onError(errorHandler);
    app.use("/api/*", createSessionMiddleware(getSession));
    app.route("/api/v1", createStatementRouter(service, { origin: ORIGIN, ...limits }));

    return app;
}

function post(app: Hono<AppEnv>, body: unknown, headers: Record<string, string> = {}) {
    return app.request("/api/v1/me/statements", {
        method: "POST",
        headers: { Origin: ORIGIN, "Content-Type": "application/json", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
}

function patch(app: Hono<AppEnv>, id: string, body: unknown, headers: Record<string, string> = {}) {
    return app.request(`/api/v1/me/statements/${id}`, {
        method: "PATCH",
        headers: { Origin: ORIGIN, "Content-Type": "application/json", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
}

async function errorOf(res: Response) {
    return ((await res.json()) as { error: { code: string; message: string } }).error;
}

describe("signed out", () => {
    it("answers 401 on every statement route", async () => {
        const app = build(signedOut);
        const calls = [
            post(app, { text: "hi" }),
            patch(app, ID, { ended: true }),
            app.request("/api/v1/me/statements/current"),
        ];

        for (const res of await Promise.all(calls)) {
            expect(res.status).toBe(401);
            expect(res.headers.get("Cache-Control")).toBe("no-store");
        }
    });
});

describe("POST /me/statements", () => {
    it("returns 201 with the statement and no-store", async () => {
        const res = await post(build(), { text: "  Out   tonight " });

        expect(res.status).toBe(201);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(await res.json()).toEqual({ data: statement, error: null });
    });

    it("answers 422 with the statement message for bad text, an extra field and a non-JSON body", async () => {
        const app = build();

        for (const body of [
            { text: "" },
            { text: "a".repeat(121) },
            { text: "hi", statement_id: "x" },
            "{not json",
            {},
        ]) {
            const res = await post(app, body);

            expect(res.status).toBe(422);
            expect(await errorOf(res)).toEqual({ code: "VALIDATION_ERROR", message: STATEMENT_MESSAGE });
        }
    });

    it("answers 413 for a body over 1 KB", async () => {
        const res = await post(build(), { text: "hi", pad: "x".repeat(2048) });

        expect(res.status).toBe(413);
        expect((await errorOf(res)).code).toBe("PAYLOAD_TOO_LARGE");
    });

    it("answers 403 for a foreign Origin and for no Origin", async () => {
        const app = build();
        const foreign = await post(app, { text: "hi" }, { Origin: "https://evil.example" });
        const none = await app.request("/api/v1/me/statements", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: "hi" }),
        });

        expect(foreign.status).toBe(403);
        expect(await errorOf(foreign)).toEqual({ code: "FORBIDDEN", message: "Request not allowed" });
        expect(none.status).toBe(403);
    });
});

describe("PATCH /me/statements/:id", () => {
    it("returns 200 with the ended statement", async () => {
        const res = await patch(build(), ID, { ended: true });

        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(await res.json()).toEqual({ data: { ...statement, running: false }, error: null });
    });

    it("answers 422 for a wrong body", async () => {
        const app = build();

        for (const body of [{}, { ended: false }, { ended: true, text: "x" }, "{not json"]) {
            const res = await patch(app, ID, body);

            expect(res.status).toBe(422);
            expect(await errorOf(res)).toEqual({ code: "VALIDATION_ERROR", message: END_BODY_MESSAGE });
        }
    });

    it("passes a 409 STATEMENT_ENDED through", async () => {
        const res = await patch(build(), "gone", { ended: true });

        expect(res.status).toBe(409);
        expect(await errorOf(res)).toEqual({ code: "STATEMENT_ENDED", message: STATEMENT_ENDED_MESSAGE });
    });

    it("answers 403 for a foreign Origin", async () => {
        const res = await patch(build(), ID, { ended: true }, { Origin: "https://evil.example" });

        expect(res.status).toBe(403);
    });
});

describe("GET /me/statements/current", () => {
    it("returns an object with a null statement and no-store", async () => {
        const res = await build().request("/api/v1/me/statements/current");

        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(await res.json()).toEqual({ data: { statement: null }, error: null });
    });
});

describe("rate limits", () => {
    it("shares one write window between start and end, with Retry-After", async () => {
        const app = build(signedIn, { writeLimit: 2 });

        expect((await post(app, { text: "hi" })).status).toBe(201);
        expect((await patch(app, ID, { ended: true })).status).toBe(200);

        const res = await post(app, { text: "hi" });

        expect(res.status).toBe(429);
        expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
        expect((await errorOf(res)).code).toBe("RATE_LIMITED");
    });

    it("limits the read route on its own window", async () => {
        const app = build(signedIn, { readLimit: 1, writeLimit: 5 });

        expect((await app.request("/api/v1/me/statements/current")).status).toBe(200);
        expect((await app.request("/api/v1/me/statements/current")).status).toBe(429);
        expect((await post(app, { text: "hi" })).status).toBe(201);
    });
});
