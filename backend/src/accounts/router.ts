// Account route for the signed-in owner: DELETE /me. The router does the transport
// checks (same origin, sign-in, per-user limit, body size, JSON content type, strict
// parse), hands off to the service, then clears the session cookie and answers 204.
// The response is no-store, because it changes the owner's own account.
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { createSameOriginGuard } from "../middleware/same-origin.js";
import { requireUser, type AppEnv } from "../middleware/session.js";
import { AppError } from "../shared/errors.js";
import { createUserLimiter } from "../shared/user-limiter.js";
import { CONFIRM_MESSAGE, deleteAccountSchema } from "./model.js";
import type { AccountService } from "./service.js";

const BODY_LIMIT_BYTES = 1024;
const LIMIT_PER_MINUTE = 5;

type Options = {
    origin: string;
    clearSession: (headers: Headers) => Promise<Headers>;
    limit?: number;
};

export function createAccountRouter(
    service: AccountService,
    { origin, clearSession, limit = LIMIT_PER_MINUTE }: Options,
) {
    const router = new Hono<AppEnv>();
    const sameOrigin = createSameOriginGuard({ origin });
    const window = createUserLimiter({ limit });

    const limitDelete: MiddlewareHandler<AppEnv> = async (c, next) => {
        window.check(c.var.user!.id);

        await next();
    };

    const limitBody = bodyLimit({
        maxSize: BODY_LIMIT_BYTES,
        onError: (c) => {
            return c.json({ data: null, error: { code: "PAYLOAD_TOO_LARGE", message: "Request too large" } }, 413);
        },
    });

    // set before the handler runs, so errors carry it too
    const noStore: MiddlewareHandler<AppEnv> = async (c, next) => {
        c.header("Cache-Control", "no-store");

        await next();
    };

    router.use("/me", noStore);

    router.delete("/me", sameOrigin, requireUser, limitDelete, limitBody, async (c) => {
        if (!c.req.header("Content-Type")?.toLowerCase().startsWith("application/json")) {
            throw new AppError(422, "VALIDATION_ERROR", CONFIRM_MESSAGE);
        }

        const body: unknown = await c.req.json().catch(() => null);
        const parsed = deleteAccountSchema.safeParse(body);

        if (!parsed.success) {
            throw new AppError(422, "VALIDATION_ERROR", CONFIRM_MESSAGE);
        }

        await service.deleteAccount(c.var.user!.id, parsed.data);

        // clear the session cookie
        const cleared = await clearSession(c.req.raw.headers);

        for (const cookie of cleared.getSetCookie()) {
            c.header("Set-Cookie", cookie, { append: true });
        }

        return c.body(null, 204);
    });

    return router;
}
