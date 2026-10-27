// Central config. Reads the environment once at boot, validates it, and exports a
// frozen config object. A missing or malformed variable stops the server at startup.
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment configuration:", z.flattenError(parsed.error).fieldErrors);
    process.exit(1);
}

export const config = Object.freeze(parsed.data);
