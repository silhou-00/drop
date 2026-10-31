// Tests for the same-origin guard: a foreign Origin is refused for JSON and multipart,
// a request with neither header is refused, and a matching Origin, a same-origin fetch
// metadata header and a safe method pass.
import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../shared/errors.js";
import { createSameOriginGuard } from "./same-origin.js";

const ORIGIN = "http://localhost:5173";

function build() {
    const app = new Hono();

    app.onError(errorHandler);
    app.use("*", createSameOriginGuard({ origin: ORIGIN }));
    app.all("*", (c) => c.text("ok"));

    return app;
}

function call(method: string, headers: Record<string, string> = {}, body?: string | FormData) {
    return build().request("/x", { method, headers, body });
}

describe("createSameOriginGuard", () => {
    it("refuses a foreign Origin with a JSON body", async () => {
        const res = await call("POST", { Origin: "https://evil.example", "Content-Type": "application/json" }, "{}");

        expect(res.status).toBe(403);
        expect(await res.json()).toEqual({ data: null, error: { code: "FORBIDDEN", message: "Request not allowed" } });
    });

    it("refuses a foreign Origin with a multipart body", async () => {
        const form = new FormData();

        form.set("a", "b");

        expect((await call("POST", { Origin: "https://evil.example" }, form)).status).toBe(403);
    });

    it("refuses a request with no Origin and no Sec-Fetch-Site", async () => {
        expect((await call("PATCH", { "Content-Type": "application/json" }, "{}")).status).toBe(403);
    });

    it("passes a matching Origin", async () => {
        expect((await call("DELETE", { Origin: ORIGIN })).status).toBe(200);
    });

    it("passes a same-origin Sec-Fetch-Site and refuses a cross-site one", async () => {
        expect((await call("POST", { "Sec-Fetch-Site": "same-origin" })).status).toBe(200);
        expect((await call("POST", { "Sec-Fetch-Site": "cross-site" })).status).toBe(403);
    });

    it("passes GET, HEAD and OPTIONS without headers", async () => {
        expect((await call("GET")).status).toBe(200);
        expect((await call("HEAD")).status).toBe(200);
        expect((await call("OPTIONS")).status).toBe(200);
    });
});
