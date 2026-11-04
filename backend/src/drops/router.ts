// Drop routes. The public send endpoint, and the signed-in inbox: list, read one, mark
// read, delete, the owner-only photo, and the live stream that tells an open inbox when a
// drop lands (server-sent events, ended after a set lifetime so the page reconnects).
// The router does the transport checks (same origin,
// body size, content type, parse, per-user limit), then hands off to the service.
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { streamSSE, type SSEStreamingApi } from "hono/streaming";
import { createSameOriginGuard } from "../middleware/same-origin.js";
import { requireUser, type AppEnv } from "../middleware/session.js";
import { AppError } from "../shared/errors.js";
import { createUserLimiter } from "../shared/user-limiter.js";
import { inboxQuerySchema, readBodySchema } from "./model.js";
import type { DropService } from "./service.js";

const BODY_LIMIT_BYTES = 9 * 1024 * 1024;
const READ_BODY_LIMIT_BYTES = 1024;
const MULTIPART = "multipart/form-data";
const INBOX_LIMIT_PER_MINUTE = 120;
const PHOTO_LIMIT_PER_MINUTE = 300;
const STREAM_LIMIT_PER_MINUTE = 10;
const HEARTBEAT_MS = 25_000;
const STREAM_LIFETIME_MS = 600_000;

type Options = {
    origin: string;
    inboxLimit?: number;
    photoLimit?: number;
    streamLimit?: number;
    heartbeatMs?: number;
    streamLifetimeMs?: number;
};

// resolves when the client leaves or the lifetime ends, pinging in between
function holdOpen(stream: SSEStreamingApi, heartbeatMs: number, lifetimeMs: number): Promise<void> {
    return new Promise((resolve) => {
        const ping = setInterval(() => {
            void stream.write(": ping\n\n");
        }, heartbeatMs);
        const expire = setTimeout(finish, lifetimeMs);

        function finish() {
            clearInterval(ping);
            clearTimeout(expire);
            resolve();
        }

        stream.onAbort(finish);
    });
}

export function createDropRouter(
    service: DropService,
    {
        origin,
        inboxLimit = INBOX_LIMIT_PER_MINUTE,
        photoLimit = PHOTO_LIMIT_PER_MINUTE,
        streamLimit = STREAM_LIMIT_PER_MINUTE,
        heartbeatMs = HEARTBEAT_MS,
        streamLifetimeMs = STREAM_LIFETIME_MS,
    }: Options,
) {
    const router = new Hono<AppEnv>();
    const originGuard = createSameOriginGuard({ origin });

    const limitBody = bodyLimit({
        maxSize: BODY_LIMIT_BYTES,
        onError: (c) => {
            return c.json(
                { data: null, error: { code: "PAYLOAD_TOO_LARGE", message: "That photo is too large." } },
                413,
            );
        },
    });

    router.post("/profiles/:username/drops", originGuard, limitBody, async (c) => {
        if (!c.req.header("content-type")?.toLowerCase().startsWith(MULTIPART)) {
            throw new AppError(422, "VALIDATION_ERROR", "Send the drop as a form.");
        }

        const fields = await c.req.parseBody({ all: true }).catch(() => null);

        if (!fields) {
            throw new AppError(422, "VALIDATION_ERROR", "Send the drop as a form.");
        }

        const result = await service.sendDrop({
            username: c.req.param("username"),
            ip: getConnInfo(c).remote.address ?? "unknown",
            deviceId: c.var.deviceId,
            fields,
        });

        c.header("Cache-Control", "no-store");

        return c.json({ data: result, error: null }, 201);
    });

    // per-user limits: one window shared by the inbox routes, one for photos, one for stream opens
    const inboxWindow = createUserLimiter({ limit: inboxLimit });
    const photoWindow = createUserLimiter({ limit: photoLimit });
    const streamWindow = createUserLimiter({ limit: streamLimit });

    const limitInbox: MiddlewareHandler<AppEnv> = async (c, next) => {
        inboxWindow.check(c.var.user!.id);

        await next();
    };

    const limitPhoto: MiddlewareHandler<AppEnv> = async (c, next) => {
        photoWindow.check(c.var.user!.id);

        await next();
    };

    const limitStream: MiddlewareHandler<AppEnv> = async (c, next) => {
        streamWindow.check(c.var.user!.id);

        await next();
    };

    const limitReadBody = bodyLimit({
        maxSize: READ_BODY_LIMIT_BYTES,
        onError: (c) => {
            return c.json({ data: null, error: { code: "PAYLOAD_TOO_LARGE", message: "Request too large" } }, 413);
        },
    });

    // recipient responses carry personal data; the photo route sets its own header
    router.use("/drops/*", async (c, next) => {
        await next();

        if (!c.res.headers.has("Cache-Control")) {
            c.header("Cache-Control", "no-store");
        }
    });

    router.get("/drops", requireUser, limitInbox, async (c) => {
        const parsed = inboxQuerySchema.safeParse(c.req.query());

        if (!parsed.success) {
            throw new AppError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
        }

        const page = await service.listInbox(c.var.user!.id, parsed.data);

        return c.json({ data: page, error: null });
    });

    // registered before the :id route so "stream" is never read as an id
    router.get("/drops/stream", requireUser, limitStream, async (c) => {
        let send: ((id: string) => void) | null = null;

        // a missing profile or a full hub fails here, as a normal JSON error
        const stop = await service.watchInbox(c.var.user!.id, (id) => send?.(id));
        const res = streamSSE(c, async (stream) => {
            send = (id) => {
                void stream.writeSSE({ event: "drop", data: id });
            };

            try {
                await stream.write("retry: 5000\n\n");
                await holdOpen(stream, heartbeatMs, streamLifetimeMs);
            } finally {
                stop();
            }
        });

        // the /drops/* header fill skips a response that already has Cache-Control
        res.headers.set("Cache-Control", "no-store");
        res.headers.set("X-Accel-Buffering", "no");

        return res;
    });

    router.get("/drops/:id", requireUser, limitInbox, async (c) => {
        const item = await service.getDrop(c.var.user!.id, c.req.param("id"));

        return c.json({ data: item, error: null });
    });

    router.patch("/drops/:id", originGuard, requireUser, limitInbox, limitReadBody, async (c) => {
        const body: unknown = await c.req.json().catch(() => null);
        const parsed = readBodySchema.safeParse(body);

        if (!parsed.success) {
            throw new AppError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
        }

        const item = await service.markRead(c.var.user!.id, c.req.param("id"), parsed.data.is_read);

        return c.json({ data: item, error: null });
    });

    router.delete("/drops/:id", originGuard, requireUser, limitInbox, async (c) => {
        await service.deleteDrop(c.var.user!.id, c.req.param("id"));

        return c.body(null, 204);
    });

    router.get("/drops/:id/photo", requireUser, limitPhoto, async (c) => {
        const bytes = await service.readPhoto(c.var.user!.id, c.req.param("id"));

        return c.body(new Uint8Array(bytes), 200, {
            "Content-Type": "image/webp",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Disposition": "inline",
        });
    });

    return router;
}
