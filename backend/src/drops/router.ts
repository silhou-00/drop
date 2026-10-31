// Drop routes. The public send endpoint, and the signed-in inbox: list, read one, mark
// read, delete, and the owner-only photo. The router does the transport checks (same origin,
// body size, content type, parse, per-user limit), then hands off to the service.
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
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

type Options = {
    origin: string;
    inboxLimit?: number;
    photoLimit?: number;
};

export function createDropRouter(
    service: DropService,
    { origin, inboxLimit = INBOX_LIMIT_PER_MINUTE, photoLimit = PHOTO_LIMIT_PER_MINUTE }: Options,
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

    // per-user limits: one window shared by the inbox routes, one for photos
    const inboxWindow = createUserLimiter({ limit: inboxLimit });
    const photoWindow = createUserLimiter({ limit: photoLimit });

    const limitInbox: MiddlewareHandler<AppEnv> = async (c, next) => {
        inboxWindow.check(c.var.user!.id);

        await next();
    };

    const limitPhoto: MiddlewareHandler<AppEnv> = async (c, next) => {
        photoWindow.check(c.var.user!.id);

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
