// Drizzle Kit config. Used by the db:generate and db:migrate commands, which run
// outside the app, so it reads DATABASE_URL itself from ../.env or the environment.
import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

if (existsSync("../.env")) {
    process.loadEnvFile("../.env");
}

const url = process.env.DATABASE_URL;

if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to drop-app/.env.");
}

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/*/model.ts",
    out: "./drizzle",
    dbCredentials: { url },
});
