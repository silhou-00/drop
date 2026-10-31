// Statement routes for the signed-in owner: start one, end one early, and read the
// running one. The router does the transport checks (same origin, sign-in, per-user
// limits, body size, strict parse), then hands off to the service. Every response is
// no-store, because it carries the owner's own data.
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { createSameOriginGuard } from "../middleware/same-origin.js";
import { requireUser, type AppEnv } from "../middleware/session.js";
import { AppError } from "../shared/errors.js";
import { createUserLimiter } from "../shared/user-limiter.js";
import { createStatementSchema, endStatementSchema } from "./model.js";
import type { StatementService } from "./service.js";

const BODY_LIMIT_BYTES = 1024;
const READ_LIMIT_PER_MINUTE = 60;
const WRITE_LIMIT = 10;
const WRITE_WINDOW_MS = 15 * 60_000;

type Options = {
    origin: string;
    readLimit?: number;
    writeLimit?: number;
    writeWindowMs?: number;
};

export function createStatementRouter(
    service: StatementService,
    { origin, readLimit = READ_LIMIT_PER_MINUTE, writeLimit = WRITE_LIMIT, writeWindowMs = WRITE_WINDOW_MS }: Options,
) {
    const router = new Hono<AppEnv>();
    const sameOrigin = createSameOriginGuard({ origin });

    // one write window shared by start and end
    const readWindow = createUserLimiter({ limit: readLimit });
    const writeWindow = createUserLimiter({ limit: writeLimit, windowMs: writeWindowMs });

    const limitRead: MiddlewareHandler<AppEnv> = async (c, next) => {
        readWindow.check(c.var.user!.id);

        await next();
    };

    const limitWrite: MiddlewareHandler<AppEnv> = async (c, next) => {
        writeWindow.check(c.var.user!.id);

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

    router.use("/me/statements", noStore);
    router.use("/me/statements/*", noStore);

    router.post("/me/statements", sameOrigin, requireUser, limitWrite, limitBody, async (c) => {
        const body: unknown = await c.req.json().catch(() => null);
        const parsed = createStatementSchema.safeParse(body);

        if (!parsed.success) {
            throw new AppError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
        }

        const statement = await service.startStatement(c.var.user!.id, parsed.data);

        return c.json({ data: statement, error: null }, 201);
    });

    router.patch("/me/statements/:id", sameOrigin, requireUser, limitWrite, limitBody, async (c) => {
        const body: unknown = await c.req.json().catch(() => null);
        const parsed = endStatementSchema.safeParse(body);

        if (!parsed.success) {
            throw new AppError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
        }

        const statement = await service.endStatement(c.var.user!.id, c.req.param("id"));

        return c.json({ data: statement, error: null });
    });

    router.get("/me/statements/current", requireUser, limitRead, async (c) => {
        const current = await service.getCurrent(c.var.user!.id);

        return c.json({ data: current, error: null });
    });

    return router;
}
