// Database client. Holds the one connection pool for the process and the Drizzle
// handle built on it. Feature repositories import db from here; shutdown calls closeDb.
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "../../config/env.js";

const POOL_MAX = 10;
const IDLE_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 10_000;

const pool = new pg.Pool({
    connectionString: config.DATABASE_URL,
    max: POOL_MAX,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
});

// idle clients can be dropped by Neon autosuspend; log the code only, never crash
pool.on("error", (error: NodeJS.ErrnoException) => {
    console.error("Database pool error:", error.code ?? "UNKNOWN");
});

export const db = drizzle(pool);

export async function closeDb() {
    await pool.end();
}
