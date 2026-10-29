// Drop routes. The public send endpoint. The router does the transport checks (origin,
// body size, content type, multipart parse), then hands the fields to the service.
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../middleware/session.js";
import { AppError } from "../shared/errors.js";
import type { DropService } from "./service.js";

const BODY_LIMIT_BYTES = 16 * 1024;
const MULTIPART = "multipart/form-data";

export function createDropRouter(service: DropService, { origin }: { origin: string }) {
    const router = new Hono<AppEnv>();
    const checkOrigin = csrf({ origin });

    // csrf throws a plain-text 403; turn it into the envelope the contract uses
    const originGuard: MiddlewareHandler = async (c, next) => {
        try {
            await checkOrigin(c, next);
        } catch (error) {
            if (error instanceof HTTPException && error.status === 403) {
                throw new AppError(403, "FORBIDDEN", "Request not allowed");
            }

            throw error;
        }
    };

    const limitBody = bodyLimit({
        maxSize: BODY_LIMIT_BYTES,
        onError: (c) => {
            return c.json({ data: null, error: { code: "PAYLOAD_TOO_LARGE", message: "Request too large" } }, 413);
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

    return router;
}
