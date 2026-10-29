// Profile routes. The public profile read, and the signed-in user's own profile (read,
// create, update). Handlers validate input and call the service; rules live there.
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { z } from "zod";
import { requireUser, type AppEnv } from "../middleware/session.js";
import { createProfileSchema, updateProfileSchema } from "./model.js";
import type { ProfileService } from "./service.js";

const BODY_LIMIT_BYTES = 4 * 1024;

function validationError(error: z.ZodError) {
    return {
        data: null,
        error: { code: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Invalid input" },
    };
}

export function createProfileRouter(service: ProfileService) {
    const router = new Hono<AppEnv>();

    const limitBody = bodyLimit({
        maxSize: BODY_LIMIT_BYTES,
        onError: (c) => {
            return c.json({ data: null, error: { code: "PAYLOAD_TOO_LARGE", message: "Request too large" } }, 413);
        },
    });

    // own profile responses carry personal data
    router.use("/me/*", async (c, next) => {
        await next();
        c.header("Cache-Control", "no-store");
    });

    router.get("/profiles/:username", async (c) => {
        const profile = await service.getPublicProfile(c.req.param("username"));

        // the response sets the device cookie, so it must not be cached
        c.header("Cache-Control", "no-store");

        return c.json({ data: profile, error: null });
    });

    router.get("/me/profile", requireUser, async (c) => {
        const profile = await service.getOwnProfile(c.var.user!.id);

        return c.json({ data: profile, error: null });
    });

    router.post("/me/profile", requireUser, limitBody, async (c) => {
        const body: unknown = await c.req.json().catch(() => null);
        const parsed = createProfileSchema.safeParse(body);

        if (!parsed.success) {
            return c.json(validationError(parsed.error), 422);
        }

        const profile = await service.createProfile(c.var.user!.id, parsed.data);

        return c.json({ data: profile, error: null }, 201);
    });

    router.patch("/me/profile", requireUser, limitBody, async (c) => {
        const body: unknown = await c.req.json().catch(() => null);
        const parsed = updateProfileSchema.safeParse(body);

        if (!parsed.success) {
            return c.json(validationError(parsed.error), 422);
        }

        const profile = await service.updateOwnProfile(c.var.user!.id, parsed.data);

        return c.json({ data: profile, error: null });
    });

    return router;
}
