// Entry point for the Drop server. One Node process serves the API under /api and
// the built frontend for every other path, so the app runs as a single service.
// Any non-API path falls back to index.html and the frontend router takes over.
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { config } from "./config/env.js";

const FRONTEND_DIST = path.relative(process.cwd(), path.resolve(import.meta.dirname, "../../frontend/dist"));

const app = new Hono();

// api
app.get("/api/v1/health", (c) => {
    return c.json({ data: { status: "ok" }, error: null });
});

app.all("/api/*", (c) => {
    return c.json({ data: null, error: { code: "NOT_FOUND", message: "Not found" } }, 404);
});

// frontend
app.use("/*", serveStatic({ root: FRONTEND_DIST }));
app.get("*", serveStatic({ path: path.join(FRONTEND_DIST, "index.html") }));

serve({ fetch: app.fetch, port: config.PORT }, (info) => {
    console.log(`Drop server listening on http://localhost:${info.port}`);
});
