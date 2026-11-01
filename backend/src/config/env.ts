// Central config. Reads the environment once at boot, validates it, and exports a
// frozen config object. A missing or malformed variable stops the server at startup.
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

// the tiles folder at the drop-app root unless TILES_DIR says otherwise
const DEFAULT_TILES_DIR = path.resolve(import.meta.dirname, "../../../tiles");

// the uploads folder at the drop-app root unless UPLOADS_DIR says otherwise
const DEFAULT_UPLOADS_DIR = path.resolve(import.meta.dirname, "../../../uploads");

// a relative DATABASE_CA_PATH is read from the backend folder
const BACKEND_DIR = path.resolve(import.meta.dirname, "../..");

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    DATABASE_CA_PATH: z
        .string()
        .optional()
        .transform((value) => (value ? path.resolve(BACKEND_DIR, value) : undefined))
        .refine((value) => value === undefined || existsSync(value), "Certificate file not found."),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    RESEND_API_KEY: z.string().startsWith("re_"),
    EMAIL_FROM: z.string().min(1),
    SENDER_KEY_SECRET: z.string().min(32),
    LOCATIONIQ_API_KEY: z.string().regex(/^pk\./),
    TILES_DIR: z
        .string()
        .optional()
        .transform((value) => path.resolve(value || DEFAULT_TILES_DIR)),
    UPLOADS_DIR: z
        .string()
        .optional()
        .transform((value) => path.resolve(value || DEFAULT_UPLOADS_DIR)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    // field names and messages only, never the submitted values
    console.error("Invalid environment configuration:", z.flattenError(parsed.error).fieldErrors);
    process.exit(1);
}

export const config = Object.freeze(parsed.data);
