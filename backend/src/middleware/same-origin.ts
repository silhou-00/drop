// Same-origin guard for state-changing routes. Any method other than GET, HEAD or
// OPTIONS passes only when the Origin header is this app's origin or the browser says
// the request is same-origin. It checks every content type, JSON included, which a
// form-only CSRF check would skip. A refusal is the 403 envelope the contract uses.
import type { MiddlewareHandler } from "hono";
import { AppError } from "../shared/errors.js";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export function createSameOriginGuard({ origin }: { origin: string }): MiddlewareHandler {
    return async (c, next) => {
        if (SAFE_METHODS.includes(c.req.method)) {
            await next();

            return;
        }

        const sameOrigin =
            c.req.header("Origin") === origin || c.req.header("Sec-Fetch-Site")?.toLowerCase() === "same-origin";

        if (!sameOrigin) {
            throw new AppError(403, "FORBIDDEN", "Request not allowed");
        }

        await next();
    };
}
