// Entry point for the Drop server. One Node process serves the API under /api and
// the built frontend for every other path, so the app runs as a single service.
// Any non-API path falls back to index.html and the frontend router takes over.
import path from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { auth } from "./auth/auth.js";
import { createAuthRouter } from "./auth/router.js";
import { config } from "./config/env.js";
import { createHealthRouter } from "./health/router.js";
import { createHealthService } from "./health/service.js";
import { createRateLimiter } from "./middleware/rate-limit.js";
import { createSecurityHeaders } from "./middleware/security-headers.js";
import { createSessionMiddleware, type AppEnv } from "./middleware/session.js";
import { createProfileRepository } from "./profiles/repository.js";
import { createProfileRouter } from "./profiles/router.js";
import { createProfileService } from "./profiles/service.js";
import { closeDb, db } from "./shared/db/client.js";
import { errorHandler } from "./shared/errors.js";

const FRONTEND_DIST = path.relative(process.cwd(), path.resolve(import.meta.dirname, "../../frontend/dist"));

const app = new Hono<AppEnv>();

app.onError(errorHandler);

// security headers on every response
app.use("*", createSecurityHeaders());

// api
app.use("/api/*", createRateLimiter());
app.use(
    "/api/*",
    createSessionMiddleware((headers) => auth.api.getSession({ headers })),
);
app.route("/", createAuthRouter());
app.route("/api/v1", createHealthRouter(createHealthService(db).checkDatabase));
app.route("/api/v1", createProfileRouter(createProfileService(createProfileRepository(db))));

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
