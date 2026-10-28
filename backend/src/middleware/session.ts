// Session middleware. Reads the session through an injected lookup (Better Auth in the
// app, a fake in tests) and puts the user and session on the request context, null when
// signed out. requireUser then turns a missing session into a 401.
import type { MiddlewareHandler } from "hono";
import type { auth } from "../auth/auth.js";

type AuthSession = typeof auth.$Infer.Session;

export type AppEnv = {
    Variables: {
        user: AuthSession["user"] | null;
        session: AuthSession["session"] | null;
    };
};

export type GetSession = (headers: Headers) => Promise<AuthSession | null>;

export function createSessionMiddleware(getSession: GetSession): MiddlewareHandler<AppEnv> {
    return async (c, next) => {
        const result = await getSession(c.req.raw.headers);

        c.set("user", result?.user ?? null);
        c.set("session", result?.session ?? null);

        await next();
    };
}

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
    if (!c.var.user) {
        return c.json({ data: null, error: { code: "UNAUTHORIZED", message: "Sign in to continue" } }, 401);
    }

    await next();
};
