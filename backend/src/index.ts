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
import { createLinkPreviewRouter } from "./link-preview/router.js";
import { createDeviceCookie } from "./middleware/device-cookie.js";
import { createRateLimiter } from "./middleware/rate-limit.js";
import { createSecurityHeaders } from "./middleware/security-headers.js";
import { createTilesRouter } from "./middleware/tiles.js";
import { createSessionMiddleware, type AppEnv } from "./middleware/session.js";
import { createKeyMaker } from "./drops/keys.js";
import { createSendLimiter } from "./drops/limits.js";
import { createDropRepository } from "./drops/repository.js";
import { createDropRouter } from "./drops/router.js";
import { createDropService } from "./drops/service.js";
import { createLocationIqClient } from "./places/client.js";
import { createPlaceRepository } from "./places/repository.js";
import { createPlaceService } from "./places/service.js";
import { createProfileRepository } from "./profiles/repository.js";
import { createProfileRouter } from "./profiles/router.js";
import { createProfileService } from "./profiles/service.js";
import { closeDb, db } from "./shared/db/client.js";
import { errorHandler } from "./shared/errors.js";

const FRONTEND_DIST = path.relative(process.cwd(), path.resolve(import.meta.dirname, "../../frontend/dist"));

const ORIGIN = new URL(config.BETTER_AUTH_URL).origin;
const SECURE = new URL(config.BETTER_AUTH_URL).protocol === "https:";

const profileRepository = createProfileRepository(db);
const profileService = createProfileService(profileRepository);
const placeService = createPlaceService({
    repo: createPlaceRepository(db),
    client: createLocationIqClient({ apiKey: config.LOCATIONIQ_API_KEY }),
});
const dropService = createDropService({
    findRecipient: profileRepository.findByUsername,
    drops: createDropRepository(db),
    limiter: createSendLimiter(),
    keys: createKeyMaker(config.SENDER_KEY_SECRET),
    lookupPlaceName: placeService.lookupPlaceName,
});

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
app.use("/api/v1/profiles/*", createDeviceCookie({ secure: SECURE }));
app.route("/", createAuthRouter());
app.route("/api/v1", createHealthRouter(createHealthService(db).checkDatabase));
app.route("/api/v1", createProfileRouter(profileService));
app.route("/api/v1", createDropRouter(dropService, { origin: ORIGIN }));

app.all("/api/*", (c) => {
    return c.json({ data: null, error: { code: "NOT_FOUND", message: "Not found" } }, 404);
});

// map files, served from the same origin
app.route("/", createTilesRouter({ dir: config.TILES_DIR }));

// frontend
app.use("/*", serveStatic({ root: FRONTEND_DIST }));
app.route(
    "/",
    createLinkPreviewRouter({
        getPublicProfile: profileService.getPublicProfile,
        templatePath: path.join(FRONTEND_DIST, "index.html"),
        origin: ORIGIN,
    }),
);
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
