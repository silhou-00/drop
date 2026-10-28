# Backend Technical Reference

## Layout

```
backend/
├── src/
│   ├── index.ts              entry point: rate limiter, routers, static frontend, server start, shutdown
│   ├── config/env.ts         environment validation, exports `config`
│   ├── health/               router.ts (health, ready), service.ts (database check), router.test.ts
│   ├── middleware/           rate-limit.ts
│   └── shared/db/client.ts   connection pool and Drizzle handle (`db`, `closeDb`)
├── drizzle/                  migrations (SQL) and the Drizzle journal
├── drizzle.config.ts         Drizzle Kit settings, reads `../.env`
├── tsconfig.json
└── package.json
```

Compiled output goes to `backend/dist/`. The server serves `frontend/dist/` for every path outside `/api`, and falls back to `index.html` so the frontend router handles the path.

## Commands

Run from `drop-app/`.

| Command            | Does                                                              |
| ------------------ | ----------------------------------------------------------------- |
| `pnpm dev:backend` | `tsx watch` on `src/index.ts`, reads `drop-app/.env` if present   |
| `pnpm build`       | Builds the frontend, then `tsc` compiles the backend into `dist/` |
| `pnpm start`       | `node dist/index.js`, reads `drop-app/.env` if present            |
| `pnpm typecheck`   | `tsc --noEmit`                                                    |
| `pnpm test`        | `vitest run src`                                                  |
| `pnpm db:generate` | `drizzle-kit generate`, reads `drop-app/.env`                     |
| `pnpm db:migrate`  | `drizzle-kit migrate`, applies pending migrations                 |

## Environment variables

Validated at boot by `src/config/env.ts` (Zod). A bad value stops the process.

| Variable       | Type                                         | Default       | Purpose                                                       |
| -------------- | -------------------------------------------- | ------------- | ------------------------------------------------------------- |
| `NODE_ENV`     | `development`, `production`, or `test`       | `development` | Runtime mode                                                  |
| `PORT`         | integer 1 to 65535                           | `3000`        | Port the server listens on                                    |
| `DATABASE_URL` | URL with `postgres:` or `postgresql:` scheme | required      | Neon direct (non-pooled) connection string, `sslmode=require` |

## Endpoints

All responses use the envelope `{ "data": ..., "error": null }` or `{ "data": null, "error": { "code", "message" } }`.

| Method | Path                 | Response                                                                                                             |
| ------ | -------------------- | -------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/health`     | `200`, `data: { status: "ok" }`                                                                                      |
| GET    | `/api/v1/ready`      | `200`, `data: { status: "ready" }`; `503`, `error.code: "NOT_READY"` when the database cannot be reached (no detail) |
| any    | `/api/*` (unmatched) | `404`, `error.code: "NOT_FOUND"`                                                                                     |
| GET    | any other path       | Static file from `frontend/dist`, or `index.html`                                                                    |

Health and ready send `Cache-Control: no-store`.

## Rate limiting

`src/middleware/rate-limit.ts`, applied to `/api/*`. Fixed window, 60 requests per minute per client IP (from `getConnInfo`, no proxy headers). Over the limit: `429`, `error.code: "RATE_LIMITED"`, `Retry-After` in seconds. Held in memory, per instance, reset on restart. Expired entries are pruned on an unref'd timer.

## Database

`src/shared/db/client.ts`: one `pg` pool (max 10, idle timeout 30 s, connect timeout 10 s) wrapped by Drizzle (`drizzle-orm/node-postgres`). Pool errors log only the error code. On SIGTERM or SIGINT the server stops accepting connections, calls `closeDb()`, and exits.

Schema files are `src/<feature>/model.ts` (matched by `drizzle.config.ts`). Migrations live in `drizzle/` and are applied by `pnpm db:migrate`, never on boot. Migration `0000_extensions` enables `postgis` and `citext`. No tables exist yet; they ship with the feature modules.

## Versions

Pinned exactly (`save-exact=true`). Node 24.

| Package             | Version |
| ------------------- | ------- |
| `hono`              | 4.13.14 |
| `@hono/node-server` | 2.1.5   |
| `zod`               | 4.6.7   |
| `drizzle-orm`       | 0.45.4  |
| `pg`                | 8.23.1  |
| `drizzle-kit`       | 0.31.11 |
| `@types/pg`         | 8.23.1  |
| `vitest`            | 5.0.4   |
| `typescript`        | 7.0.2   |
| `tsx`               | 4.23.15 |
| `@types/node`       | 24.19.2 |

`esbuild` (pulled in by `tsx`) is the only package allowed to run install scripts (`onlyBuiltDependencies` in `pnpm-workspace.yaml`).
