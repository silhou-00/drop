// Health routes. /health says the process is up; /ready says it can also reach the
// database. A failed readiness check returns no detail about the database.
import { Hono } from "hono";

export function createHealthRouter(checkDatabase: () => Promise<boolean>) {
    const router = new Hono();

    router.use("*", async (c, next) => {
        await next();
        c.header("Cache-Control", "no-store");
    });

    router.get("/health", (c) => {
        return c.json({ data: { status: "ok" }, error: null });
    });

    router.get("/ready", async (c) => {
        if (!(await checkDatabase())) {
            return c.json({ data: null, error: { code: "NOT_READY", message: "Not ready" } }, 503);
        }

        return c.json({ data: { status: "ready" }, error: null });
    });

    return router;
}
