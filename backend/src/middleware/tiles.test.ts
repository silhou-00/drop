// Tests for the tiles route against a temporary folder: ranges, a missing file, path
// traversal, headers, methods, and the rate limit.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTilesRouter } from "./tiles.js";

const nodeEnv = { incoming: { socket: { remoteAddress: "203.0.113.7" } } };

let root: string;
let app: Hono;

function get(url: string, init: RequestInit = {}) {
    return app.request(url, init, nodeEnv);
}

beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), "drop-tiles-"));

    const dir = path.join(root, "tiles");

    mkdirSync(path.join(dir, "fonts"), { recursive: true });
    writeFileSync(path.join(dir, "map.pmtiles"), "0123456789");
    writeFileSync(path.join(dir, "fonts", "0-255.pbf"), "glyphs");
    writeFileSync(path.join(root, "secret.txt"), "top secret");

    app = new Hono();
    app.route("/", createTilesRouter({ dir }));
    app.get("*", (c) => c.text("index page"));
});

afterAll(() => {
    rmSync(root, { recursive: true, force: true });
});

describe("/tiles", () => {
    it("serves a file with the right headers", async () => {
        const res = await get("/tiles/map.pmtiles");

        expect(res.status).toBe(200);
        expect(await res.text()).toBe("0123456789");
        expect(res.headers.get("Accept-Ranges")).toBe("bytes");
        expect(res.headers.get("Cache-Control")).toBe("public, max-age=86400");
        expect(res.headers.get("Content-Type")).toBe("application/octet-stream");
    });

    it("answers a Range request with 206", async () => {
        const res = await get("/tiles/map.pmtiles", { headers: { Range: "bytes=2-5" } });

        expect(res.status).toBe(206);
        expect(res.headers.get("Content-Range")).toBe("bytes 2-5/10");
        expect(await res.text()).toBe("2345");
    });

    it("types protobuf glyph files", async () => {
        const res = await get("/tiles/fonts/0-255.pbf");

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Type")).toBe("application/x-protobuf");
    });

    it("answers HEAD", async () => {
        const res = await get("/tiles/map.pmtiles", { method: "HEAD" });

        expect(res.status).toBe(200);
        expect(res.headers.get("Content-Length")).toBe("10");
    });

    it("returns a plain 404 for a missing file, never the index page", async () => {
        const res = await get("/tiles/missing.pmtiles");

        expect(res.status).toBe(404);
        expect(await res.text()).toBe("Not found");
    });

    it("blocks path traversal and encoded variants", async () => {
        for (const url of [
            "/tiles/../secret.txt",
            "/tiles/%2e%2e/secret.txt",
            "/tiles/%2E%2E%2Fsecret.txt",
            "/tiles/..%2fsecret.txt",
            "/tiles/..%5csecret.txt",
            "/tiles/fonts/..%2f..%2fsecret.txt",
            "/tiles/..\secret.txt",
        ]) {
            const res = await get(url);
            const text = await res.text();

            expect(text).not.toContain("top secret");
            // a URL the client normalizes away from /tiles reaches the page fallback, never a file
            expect(res.status === 404 || text === "index page").toBe(true);
        }
    });

    it("answers other methods with 404", async () => {
        const res = await get("/tiles/map.pmtiles", { method: "POST" });

        expect(res.status).toBe(404);
    });

    it("rate limits per IP with Retry-After", async () => {
        let last: Response | undefined;

        for (let i = 0; i < 601; i += 1) {
            last = await get("/tiles/map.pmtiles", { method: "HEAD" });
        }

        expect(last?.status).toBe(429);
        expect(last?.headers.get("Retry-After")).toBeTruthy();
    });
});
