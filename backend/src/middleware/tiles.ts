// Map file route. Serves the tiles folder at /tiles, read-only and from the same origin as
// the app, so the map needs no extra host. serveStatic answers byte ranges with 206 and
// refuses ".." and encoded paths. A missing file is a plain 404, never the index page.
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { createRateLimiter } from "./rate-limit.js";

type Options = {
    dir: string;
};

const PREFIX = "/tiles";
const LIMIT_PER_MINUTE = 600;
const CACHE_CONTROL = "public, max-age=86400";

const CONTENT_TYPES: Record<string, string> = {
    ".pmtiles": "application/octet-stream",
    ".pbf": "application/x-protobuf",
    ".json": "application/json",
    ".png": "image/png",
};

function contentTypeFor(path: string): string | undefined {
    const dot = path.lastIndexOf(".");

    return dot === -1 ? undefined : CONTENT_TYPES[path.slice(dot).toLowerCase()];
}

export function createTilesRouter({ dir }: Options) {
    const router = new Hono();

    // headers for found files; set after the file is served
    router.use(`${PREFIX}/*`, async (c, next) => {
        await next();

        if (c.res.status === 200 || c.res.status === 206) {
            c.header("Accept-Ranges", "bytes");
            c.header("Cache-Control", CACHE_CONTROL);

            const type = contentTypeFor(c.req.path);

            if (type) {
                c.header("Content-Type", type);
            }
        }
    });

    router.use(`${PREFIX}/*`, createRateLimiter({ limit: LIMIT_PER_MINUTE }));
    router.use(
        `${PREFIX}/*`,
        serveStatic({ root: dir, rewriteRequestPath: (path) => path.slice(PREFIX.length) || "/" }),
    );

    // anything not served above is a plain 404
    router.all(`${PREFIX}/*`, (c) => {
        return c.text("Not found", 404);
    });

    return router;
}
