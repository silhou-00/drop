// Drizzle Kit config. Used by the db:generate and db:migrate commands, which run
// outside the app, so it reads DATABASE_URL itself from ../.env or the environment.
// DATABASE_CA_PATH pins the server certificate the same way the app's pool does.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";
import { withoutSslParams } from "./src/shared/db/ssl.js";

if (existsSync("../.env")) {
    process.loadEnvFile("../.env");
}

const url = process.env.DATABASE_URL;
const caPath = process.env.DATABASE_CA_PATH;

if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to drop-app/.env.");
}

// the URL form takes no ssl option, so a pinned certificate needs the parts form
function credentialsWithCa(ca: string) {
    const parsed = new URL(withoutSslParams(url as string));

    return {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : undefined,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: decodeURIComponent(parsed.pathname.slice(1)),
        ssl: { ca, rejectUnauthorized: true },
    };
}

// a relative path is read from the backend folder, as in the app
const ca = caPath ? readFileSync(path.resolve(import.meta.dirname, caPath), "utf8") : undefined;

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/*/model.ts",
    out: "./drizzle",
    dbCredentials: ca ? credentialsWithCa(ca) : { url },
});
