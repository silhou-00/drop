// Entry point for the Drop server. One Node process serves the API under /api and
// the built frontend for every other path, so the app runs as a single service.
// Any non-API path falls back to index.html and the frontend router takes over.
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { config } from "./config/env.js";
import { createHealthRouter } from "./health/router.js";
import { createHealthService } from "./health/service.js";
import { createRateLimiter } from "./middleware/rate-limit.js";
import { closeDb, db } from "./shared/db/client.js";

const FRONTEND_DIST = path.relative(process.cwd(), path.resolve(import.meta.dirname, "../../frontend/dist"));

const app = new Hono();

// api
app.use("/api/*", createRateLimiter());
app.route("/api/v1", createHealthRouter(createHealthService(db).checkDatabase));

app.all("/api/*", (c) => {
    return c.json({ data: null, error: { code: "NOT_FOUND", message: "Not found" } }, 404);
});

// frontend
app.use("/*", serveStatic({ root: FRONTEND_DIST }));
app.get("*", serveStatic({ path: path.join(FRONTEND_DIST, "index.html") }));

const server = serve({ fetch: app.fetch, port: config.PORT }, (info) => {
    console.log(`Drop server listening on http://localhost:${info.port}`);
});

// graceful shutdown
async function shutdown() {
    server.close();
    await closeDb();
    process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
