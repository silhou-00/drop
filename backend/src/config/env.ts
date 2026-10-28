// Central config. Reads the environment once at boot, validates it, and exports a
// frozen config object. A missing or malformed variable stops the server at startup.
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    RESEND_API_KEY: z.string().startsWith("re_"),
    EMAIL_FROM: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    // field names and messages only, never the submitted values
    console.error("Invalid environment configuration:", z.flattenError(parsed.error).fieldErrors);
    process.exit(1);
}

export const config = Object.freeze(parsed.data);
