# Backend Technical Reference

## Layout

```
backend/
├── src/
│   ├── index.ts              entry point: middleware order, routers, static frontend, server start, shutdown
│   ├── config/env.ts         environment validation, exports `config`
│   ├── auth/                 model.ts (Better Auth tables), auth.ts (setup), mailer.ts (Resend), router.ts
│   ├── profiles/             model.ts (table, Zod, messages), repository.ts, service.ts, router.ts, tests
│   ├── health/               router.ts (health, ready), service.ts (database check), router.test.ts
│   ├── middleware/           rate-limit.ts, session.ts, security-headers.ts
│   └── shared/               db/client.ts (pool, `db`, `closeDb`), db/citext.ts, errors.ts (AppError, errorHandler)
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

| Variable             | Type                                         | Default       | Purpose                                                                                                                                  |
| -------------------- | -------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | `development`, `production`, or `test`       | `development` | Runtime mode                                                                                                                             |
| `PORT`               | integer 1 to 65535                           | `3000`        | Port the server listens on                                                                                                               |
| `DATABASE_URL`       | URL with `postgres:` or `postgresql:` scheme | required      | Neon direct (non-pooled) connection string, `sslmode=require`                                                                            |
| `BETTER_AUTH_SECRET` | string, at least 32 characters               | required      | Signs sessions and cookies                                                                                                               |
| `BETTER_AUTH_URL`    | URL                                          | required      | Public origin of the app (`http://localhost:5173` in development); also the only trusted origin. Cookies are `Secure` when it is `https` |
| `RESEND_API_KEY`     | string starting `re_`                        | required      | Resend API key for sign-in emails                                                                                                        |
| `EMAIL_FROM`         | non-empty string                             | required      | Sender, for example `Drop <onboarding@resend.dev>`                                                                                       |

## Endpoints

All responses use the envelope `{ "data": ..., "error": null }` or `{ "data": null, "error": { "code", "message" } }`.

| Method | Path                                        | Response                                                                                                                                                                                                                          |
| ------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/health`                            | `200`, `data: { status: "ok" }`                                                                                                                                                                                                   |
| GET    | `/api/v1/ready`                             | `200`, `data: { status: "ready" }`; `503`, `error.code: "NOT_READY"` when the database cannot be reached (no detail)                                                                                                              |
| POST   | `/api/auth/email-otp/send-verification-otp` | Better Auth. Body `{ email, type: "sign-in" }`. `200 { success: true }`; `429` over the limit                                                                                                                                     |
| POST   | `/api/auth/sign-in/email-otp`               | Better Auth. Body `{ email, otp }`. Sets the session cookie                                                                                                                                                                       |
| GET    | `/api/auth/get-session`                     | Better Auth. `200`, `null` when signed out                                                                                                                                                                                        |
| GET    | `/api/v1/profiles/:username`                | `200 { username, displayName, avatarUrl, acceptingDrops }`; `404 NOT_FOUND` (unknown, invalid or reserved name)                                                                                                                   |
| GET    | `/api/v1/me/profile`                        | Signed in. `200` own profile (public fields plus `heatmapEnabled`, `notifyEmail`, `createdAt`); `401 UNAUTHORIZED`; `404 NOT_FOUND` before a profile exists                                                                       |
| POST   | `/api/v1/me/profile`                        | Signed in. Body `{ username, displayName, confirmAdult: true }`. `201` own profile; `409 USERNAME_TAKEN` ("That name is taken."); `409 PROFILE_EXISTS`; `422 VALIDATION_ERROR` (first message); `413 PAYLOAD_TOO_LARGE` over 4 KB |
| PATCH  | `/api/v1/me/profile`                        | Signed in. Body with at least one of `displayName`, `acceptingDrops`, `heatmapEnabled`, `notifyEmail`. `200`; `422`; `404`; `413`                                                                                                 |
| any    | `/api/*` (unmatched)                        | `404`, `error.code: "NOT_FOUND"`                                                                                                                                                                                                  |
| GET    | any other path                              | Static file from `frontend/dist`, or `index.html`                                                                                                                                                                                 |

Health, ready, `/api/auth/*` and `/api/v1/me/*` send `Cache-Control: no-store`. Unexpected errors answer `500 INTERNAL_ERROR` "Something went wrong" through `shared/errors.ts`; domain errors use `AppError(status, code, message)`.

Validation messages (exported from `profiles/model.ts`, mirrored by the frontend): "Use 3 to 30 letters, numbers, dots or underscores.", "That name is reserved.", "That name is taken.", "Enter a display name up to 50 characters.", "Confirm you are 18 or older.", "Send at least one field to update.". Reserved usernames: api, admin, sign-in, signin, sign-up, signup, claim, home, inbox, settings, playground, help, about, terms, privacy, safety, drop, drops, me, profile, profiles, login, logout, auth, support, static, assets.

## Middleware order

`index.ts`: global error handler; security headers on all paths; `/api/*` rate limiter; `/api/*` session middleware (sets `c.var.user` and `c.var.session`, null when signed out; `requireUser` answers `401`); auth router; health router; profiles router; `/api/*` 404; static files and `index.html` fallback.

## Security headers

`middleware/security-headers.ts` (Hono `secureHeaders`): `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, plus Hono defaults (COOP and CORP same-origin). Content Security Policy: `default-src self`; `script-src self`; `style-src self`; `font-src self`; `img-src self data: blob:`; `connect-src self`; `worker-src self blob:`; `object-src none`; `base-uri self`; `form-action self`; `frame-ancestors none`. The built landing page runs under it with no violations in Edge at 390 and 1280 px.

## Auth

`auth/auth.ts` (Better Auth, `basePath /api/auth`, Drizzle adapter, `trustedOrigins` = `BETTER_AUTH_URL`, telemetry off): email password disabled; `emailOTP` plugin (6 digits, 300 s expiry, 3 attempts, sends only for `sign-in` through `auth/mailer.ts` and Resend). Session lifetime 7 days, refreshed after 1 day. Cookies `httpOnly`, `SameSite=Lax`, `Secure` when `BETTER_AUTH_URL` is https. Better Auth rate limit on in every environment, in memory: 30 per 60 s per path, `send-verification-otp` 3 per 60 s, `sign-in/email-otp` 10 per 60 s. The auth router overwrites `x-forwarded-for` with the socket address so the limits count real clients; behind a proxy this must change to the trusted proxy address. Codes and email addresses are never logged.

## Tables

Migration `0001`: `user`, `session`, `account`, `verification` (Better Auth, generated with `@better-auth/cli@1.4.22`) and `profiles` per PRD section 5 (`username` citext unique, `user_id` unique with cascade delete, `age_confirmed_at` timestamptz not null).

## Rate limiting

`src/middleware/rate-limit.ts`, applied to `/api/*`. Fixed window, 60 requests per minute per client IP (from `getConnInfo`, no proxy headers). Over the limit: `429`, `error.code: "RATE_LIMITED"`, `Retry-After` in seconds. Held in memory, per instance, reset on restart. Expired entries are pruned on an unref'd timer.

## Database

`src/shared/db/client.ts`: one `pg` pool (max 10, idle timeout 30 s, connect timeout 10 s) wrapped by Drizzle (`drizzle-orm/node-postgres`). Pool errors log only the error code. On SIGTERM or SIGINT the server stops accepting connections, calls `closeDb()`, and exits.

Schema files are `src/<feature>/model.ts` (matched by `drizzle.config.ts`). Migrations live in `drizzle/` and are applied by `pnpm db:migrate`, never on boot. Migration `0000_extensions` enables `postgis` and `citext`. Tables ship with the feature modules.

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
| `better-auth`       | 1.7.8   |
| `resend`            | 6.33.0  |
| `@types/node`       | 24.19.2 |

`esbuild` (pulled in by `tsx`) is the only package allowed to run install scripts (`onlyBuiltDependencies` in `pnpm-workspace.yaml`).
