// Auth routes. Hands every GET and POST under /api/auth/* to Better Auth, which owns
// the sign-in code flow, the session cookie, and its own rate limits. The socket address
// replaces any forwarded-for header so the limits count real clients and cannot be spoofed.
import { getConnInfo } from "@hono/node-server/conninfo";
import { Hono } from "hono";
import { auth } from "./auth.js";

export function createAuthRouter() {
    const router = new Hono();

    // auth responses carry session data
    router.use("/api/auth/*", async (c, next) => {
        await next();
        c.header("Cache-Control", "no-store");
    });

    router.on(["GET", "POST"], "/api/auth/*", (c) => {
        const headers = new Headers(c.req.raw.headers);

        headers.set("x-forwarded-for", getConnInfo(c).remote.address ?? "unknown");

        return auth.handler(new Request(c.req.raw, { headers }));
    });

    return router;
}
