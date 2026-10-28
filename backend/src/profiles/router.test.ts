// Tests for the profile routes against a fake service and a fake session, so no
// database or auth provider is needed.
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createSessionMiddleware, type AppEnv, type GetSession } from "../middleware/session.js";
import { AppError, errorHandler } from "../shared/errors.js";
import { createProfileRouter } from "./router.js";
import type { OwnProfile, ProfileService, PublicProfile } from "./service.js";

const own: OwnProfile = {
    username: "maya",
    displayName: "Maya",
    avatarUrl: null,
    acceptingDrops: true,
    heatmapEnabled: false,
    notifyEmail: true,
    createdAt: "2026-10-29T00:00:00.000Z",
};

const publicShape: PublicProfile = {
    username: "maya",
    displayName: "Maya",
    avatarUrl: null,
    acceptingDrops: true,
};

const signedIn = (async () => ({ user: { id: "u1" }, session: { id: "s1" } })) as unknown as GetSession;
const signedOut: GetSession = async () => null;

function fakeService(overrides: Partial<ProfileService> = {}): ProfileService {
    return {
        getPublicProfile: async (username) => {
            if (username !== "maya") {
                throw new AppError(404, "NOT_FOUND", "Not found");
            }

            return publicShape;
        },
        getOwnProfile: async () => own,
        createProfile: async () => own,
        updateOwnProfile: async () => own,
        ...overrides,
    };
}

function buildApp(service: ProfileService, getSession: GetSession = signedIn) {
    const app = new Hono<AppEnv>();

    app.onError(errorHandler);
    app.use("/api/*", createSessionMiddleware(getSession));
    app.route("/api/v1", createProfileRouter(service));

    return app;
}

function send(app: Hono<AppEnv>, method: string, body?: unknown) {
    return app.request("/api/v1/me/profile", {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

const createBody = { username: "maya", displayName: "Maya", confirmAdult: true };

describe("GET /profiles/:username", () => {
    it("returns only the public fields", async () => {
        const res = await buildApp(fakeService(), signedOut).request("/api/v1/profiles/maya");
        const json = (await res.json()) as { data: Record<string, unknown>; error: { code: string } };

        expect(res.status).toBe(200);
        expect(json).toEqual({ data: publicShape, error: null });
        expect(Object.keys(json.data).sort()).toEqual(["acceptingDrops", "avatarUrl", "displayName", "username"]);
    });

    it("returns 404 for an unknown name", async () => {
        const res = await buildApp(fakeService(), signedOut).request("/api/v1/profiles/nobody");

        expect(res.status).toBe(404);
        expect(await res.json()).toEqual({ data: null, error: { code: "NOT_FOUND", message: "Not found" } });
    });
});

describe("/me/profile", () => {
    it("returns 401 without a session", async () => {
        const app = buildApp(fakeService(), signedOut);

        for (const method of ["GET", "POST", "PATCH"]) {
            const res = await send(app, method, method === "GET" ? undefined : createBody);

            expect(res.status).toBe(401);
            expect(await res.json()).toEqual({
                data: null,
                error: { code: "UNAUTHORIZED", message: "Sign in to continue" },
            });
        }
    });

    it("GET returns the own profile with no-store", async () => {
        const res = await send(buildApp(fakeService()), "GET");

        expect(res.status).toBe(200);
        expect(res.headers.get("Cache-Control")).toBe("no-store");
        expect(await res.json()).toEqual({ data: own, error: null });
    });

    it("POST returns 201", async () => {
        const res = await send(buildApp(fakeService()), "POST", createBody);

        expect(res.status).toBe(201);
        expect(await res.json()).toEqual({ data: own, error: null });
    });

    it("POST returns 409 when the name is taken", async () => {
        const service = fakeService({
            createProfile: async () => {
                throw new AppError(409, "USERNAME_TAKEN", "That name is taken.");
            },
        });
        const res = await send(buildApp(service), "POST", createBody);

        expect(res.status).toBe(409);
        expect(await res.json()).toEqual({
            data: null,
            error: { code: "USERNAME_TAKEN", message: "That name is taken." },
        });
    });

    it("POST returns 409 when a profile exists", async () => {
        const service = fakeService({
            createProfile: async () => {
                throw new AppError(409, "PROFILE_EXISTS", "You already have a profile");
            },
        });
        const res = await send(buildApp(service), "POST", createBody);
        const json = (await res.json()) as { data: Record<string, unknown>; error: { code: string } };

        expect(res.status).toBe(409);
        expect(json.error.code).toBe("PROFILE_EXISTS");
    });

    it("POST returns 422 without the adult confirmation", async () => {
        const res = await send(buildApp(fakeService()), "POST", { username: "maya", displayName: "Maya" });

        expect(res.status).toBe(422);
        expect(await res.json()).toEqual({
            data: null,
            error: { code: "VALIDATION_ERROR", message: "Confirm you are 18 or older." },
        });
    });

    it("POST returns 422 for a body that is not JSON", async () => {
        const res = await buildApp(fakeService()).request("/api/v1/me/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "not json",
        });

        expect(res.status).toBe(422);
    });

    it("POST rejects a body over the size limit", async () => {
        const res = await send(buildApp(fakeService()), "POST", { ...createBody, displayName: "a".repeat(5000) });

        expect(res.status).toBe(413);
    });

    it("PATCH returns 200", async () => {
        const res = await send(buildApp(fakeService()), "PATCH", { acceptingDrops: false });

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ data: own, error: null });
    });

    it("PATCH returns 422 on an empty body", async () => {
        const res = await send(buildApp(fakeService()), "PATCH", {});

        expect(res.status).toBe(422);
    });
});

describe("global error handler", () => {
    it("hides unexpected errors", async () => {
        const service = fakeService({
            getOwnProfile: async () => {
                throw new Error("secret detail");
            },
        });
        const res = await send(buildApp(service), "GET");
        const text = await res.text();

        expect(res.status).toBe(500);
        expect(text).not.toContain("secret");
        expect(JSON.parse(text).error.code).toBe("INTERNAL_ERROR");
    });
});
