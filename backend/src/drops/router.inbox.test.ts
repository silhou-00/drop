// Tests for the inbox routes against a fake service and a fake session: sign-in required,
// the 404 for foreign or malformed ids, 422 on bad input, status codes, the photo
// headers, no-store on JSON, and the per-user 429.
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createSessionMiddleware, type AppEnv, type GetSession } from "../middleware/session.js";
import { AppError, errorHandler } from "../shared/errors.js";
import { CURSOR_MESSAGE, IS_READ_MESSAGE, LIMIT_MESSAGE, type InboxItem } from "./model.js";
import { createDropRouter } from "./router.js";
import type { DropService } from "./service.js";

const ORIGIN = "http://localhost:5173";
const MINE = "11111111-1111-4111-8111-111111111111";
const THEIRS = "22222222-2222-4222-8222-222222222222";
const BAD_ID = "not-an-id";

const item: InboxItem = {
    id: MINE,
    message: "hi",
    location: { lat: 14.5995, lng: 120.9842, name: "Diliman", source: "gps" },
    has_photo: true,
    is_read: false,
    created_at: "2026-10-30T12:00:00.000Z",
};

const signedIn = (async () => ({ user: { id: "u1" }, session: { id: "s1" } })) as unknown as GetSession;
const signedOut: GetSession = async () => null;

function notFound(): never {
    throw new AppError(404, "NOT_FOUND", "Not found");
}

const service = {
    sendDrop: async () => ({ delivered: true as const }),
    listInbox: async () => ({ items: [item], next_cursor: null }),
    getDrop: async (_user: string, id: string) => (id === MINE ? item : notFound()),
    markRead: async (_user: string, id: string, isRead: boolean) =>
        id === MINE ? { ...item, is_read: isRead } : notFound(),
    deleteDrop: async (_user: string, id: string) => (id === MINE ? undefined : notFound()),
    readPhoto: async (_user: string, id: string) => (id === MINE ? Buffer.from("webp") : notFound()),
} satisfies DropService;

type Limits = { inboxLimit?: number; photoLimit?: number };

function build(getSession: GetSession = signedIn, limits: Limits = {}) {
    const app = new Hono<AppEnv>();

    app.onError(errorHandler);
    app.use("/api/*", createSessionMiddleware(getSession));
    app.route("/api/v1", createDropRouter(service, { origin: ORIGIN, ...limits }));

    return app;
}

function patch(app: Hono<AppEnv>, id: string, body: unknown) {
    return app.request(`/api/v1/drops/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
}

async function errorOf(res: Response) {
    return ((await res.json()) as { error: { code: string; message: string } }).error;
}

describe("signed out", () => {
    it("answers 401 on every inbox route", async () => {
        const app = build(signedOut);
        const calls = [
            app.request("/api/v1/drops"),
            app.request(`/api/v1/drops/${MINE}`),
            patch(app, MINE, { is_read: true }),
            app.request(`/api/v1/drops/${MINE}`, { method: "DELETE", headers: { Origin: ORIGIN } }),
            app.request(`/api/v1/drops/${MINE}/photo`),
        ];

        for (const res of await Promise.all(calls)) {
            expect(res.status).toBe(401);
        }
    });
});

describe("GET /drops", () => {
    it("returns the page in the envelope with no-store", async () => {
        const res = await build().request("/api/v1/drops?limit=5");

        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(await res.json()).toEqual({ data: { items: [item], next_cursor: null }, error: null });
    });

    it("answers 422 for a bad limit, a bad cursor and an unknown parameter", async () => {
        const app = build();

        for (const [query, message] of [
            ["limit=0", LIMIT_MESSAGE],
            ["limit=51", LIMIT_MESSAGE],
            ["limit=abc", LIMIT_MESSAGE],
            ["cursor=%21%21", CURSOR_MESSAGE],
        ]) {
            const res = await app.request(`/api/v1/drops?${query}`);

            expect(res.status).toBe(422);
            expect(await errorOf(res)).toEqual({ code: "VALIDATION_ERROR", message });
        }

        expect((await app.request("/api/v1/drops?sort=id")).status).toBe(422);
    });
});

describe("GET /drops/:id", () => {
    it("returns the item, and 404 for another user's drop or a malformed id", async () => {
        const app = build();
        const ok = await app.request(`/api/v1/drops/${MINE}`);

        expect(ok.status).toBe(200);
        expect(ok.headers.get("Cache-Control")).toBe("no-store");
        expect(await ok.json()).toEqual({ data: item, error: null });

        for (const id of [THEIRS, BAD_ID]) {
            const res = await app.request(`/api/v1/drops/${id}`);

            expect(res.status).toBe(404);
            expect(await errorOf(res)).toEqual({ code: "NOT_FOUND", message: "Not found" });
        }
    });
});

describe("PATCH /drops/:id", () => {
    it("returns 200 with the updated item", async () => {
        const res = await patch(build(), MINE, { is_read: true });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ data: { ...item, is_read: true }, error: null });
    });

    it("answers 422 for a wrong type, an extra field, an empty body and bad JSON", async () => {
        const app = build();

        for (const body of [{ is_read: "yes" }, { is_read: true, message: "x" }, {}, "{not json"]) {
            const res = await patch(app, MINE, body);

            expect(res.status).toBe(422);
            expect((await errorOf(res)).code).toBe("VALIDATION_ERROR");
        }

        expect((await errorOf(await patch(app, MINE, { is_read: 1 }))).message).toBe(IS_READ_MESSAGE);
    });

    it("answers 404 for another user's drop and for a malformed id", async () => {
        const app = build();

        expect((await patch(app, THEIRS, { is_read: true })).status).toBe(404);
        expect((await patch(app, BAD_ID, { is_read: true })).status).toBe(404);
    });

    it("answers 413 for a body over 1 KB", async () => {
        const res = await patch(build(), MINE, JSON.stringify({ is_read: true, pad: "x".repeat(2048) }));

        expect(res.status).toBe(413);
    });
});

describe("DELETE /drops/:id", () => {
    it("returns 204 with no body, and 404 for another user's drop or a malformed id", async () => {
        const app = build();
        const ok = await app.request(`/api/v1/drops/${MINE}`, { method: "DELETE", headers: { Origin: ORIGIN } });

        expect(ok.status).toBe(204);
        expect(await ok.text()).toBe("");

        for (const id of [THEIRS, BAD_ID]) {
            expect(
                (await app.request(`/api/v1/drops/${id}`, { method: "DELETE", headers: { Origin: ORIGIN } })).status,
            ).toBe(404);
        }
    });
});

describe("origin check", () => {
    it("refuses a foreign Origin on delete with 403 in the envelope", async () => {
        const res = await build().request(`/api/v1/drops/${MINE}`, {
            method: "DELETE",
            headers: { Origin: "https://evil.example" },
        });

        expect(res.status).toBe(403);
        expect(await errorOf(res)).toEqual({ code: "FORBIDDEN", message: "Request not allowed" });
    });

    it("refuses a foreign Origin on a form-encoded mark read", async () => {
        const res = await build().request(`/api/v1/drops/${MINE}`, {
            method: "PATCH",
            headers: { Origin: "https://evil.example", "Content-Type": "application/x-www-form-urlencoded" },
            body: "is_read=true",
        });

        expect(res.status).toBe(403);
    });
});

describe("GET /drops/:id/photo", () => {
    it("sends the bytes as an inline, private, uncached WebP", async () => {
        const res = await build().request(`/api/v1/drops/${MINE}/photo`);

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("image/webp");
        expect(res.headers.get("Cache-Control")).toBe("private, no-store");
        expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
        expect(res.headers.get("Content-Disposition")).toBe("inline");
        expect(Buffer.from(await res.arrayBuffer()).toString()).toBe("webp");
    });

    it("answers 404 for another user's drop and for a malformed id", async () => {
        const app = build();

        for (const id of [THEIRS, BAD_ID]) {
            const res = await app.request(`/api/v1/drops/${id}/photo`);

            expect(res.status).toBe(404);
            expect(res.headers.get("Cache-Control")).toBe("no-store");
        }
    });
});

describe("rate limits", () => {
    it("shares one window across list, detail, mark and delete, with Retry-After", async () => {
        const app = build(signedIn, { inboxLimit: 3 });

        expect((await app.request("/api/v1/drops")).status).toBe(200);
        expect((await app.request(`/api/v1/drops/${MINE}`)).status).toBe(200);
        expect((await patch(app, MINE, { is_read: true })).status).toBe(200);

        const res = await app.request(`/api/v1/drops/${MINE}`, { method: "DELETE", headers: { Origin: ORIGIN } });

        expect(res.status).toBe(429);
        expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
        expect((await errorOf(res)).code).toBe("RATE_LIMITED");
    });

    it("limits photos on their own window", async () => {
        const app = build(signedIn, { photoLimit: 1 });

        expect((await app.request(`/api/v1/drops/${MINE}/photo`)).status).toBe(200);
        expect((await app.request(`/api/v1/drops/${MINE}/photo`)).status).toBe(429);
        expect((await app.request("/api/v1/drops")).status).toBe(200);
    });
});
