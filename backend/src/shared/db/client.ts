// Database client. Holds the one connection pool for the process and the Drizzle
// handle built on it. Feature repositories import db from here; shutdown calls closeDb.
// When DATABASE_CA_PATH is set, the connection is encrypted and the server's certificate
// must chain to that file, so an unverified server is refused.
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../../config/env.js";
import { withoutSslParams } from "./ssl.js";

const POOL_MAX = 10;
const IDLE_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 10_000;

// ssl params in the URL would override the certificate, so they are dropped
const pool = new pg.Pool({
    connectionString: config.DATABASE_CA_PATH ? withoutSslParams(config.DATABASE_URL) : config.DATABASE_URL,
    ssl: config.DATABASE_CA_PATH
        ? { ca: readFileSync(config.DATABASE_CA_PATH, "utf8"), rejectUnauthorized: true }
        : undefined,
    max: POOL_MAX,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
});

// idle clients can be dropped by the pooler; log the code only, never crash
pool.on("error", (error: NodeJS.ErrnoException) => {
    console.error("Database pool error:", error.code ?? "UNKNOWN");
});

export const db = drizzle(pool);

export async function closeDb() {
    await pool.end();
}
