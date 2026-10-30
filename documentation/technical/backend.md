# Backend Technical Reference

## Layout

```
backend/
├── src/
│   ├── index.ts              entry point: middleware order, routers, static frontend, server start, shutdown
│   ├── config/env.ts         environment validation, exports `config`
│   ├── auth/                 model.ts (Better Auth tables), auth.ts (setup), mailer.ts (Resend), router.ts
│   ├── profiles/             model.ts (table, Zod, messages), repository.ts, service.ts, router.ts, tests
│   ├── drops/                model.ts (table, send schema, messages), keys.ts, limits.ts, repository.ts, service.ts, router.ts, tests
│   ├── places/               model.ts (cache table, LocationIQ reading), client.ts, repository.ts, service.ts, tests
│   ├── link-preview/         router.ts (GET /:username), service.ts (HTML rendering), tests
│   ├── health/               router.ts (health, ready), service.ts (database check), router.test.ts
│   ├── middleware/           rate-limit.ts, session.ts, security-headers.ts, device-cookie.ts, tiles.ts
│   └── shared/               db/client.ts (pool, `db`, `closeDb`), db/citext.ts, db/geography.ts (PostGIS point type, EWKB parser), errors.ts (AppError with optional retryAfterSeconds, errorHandler), fixed-window.ts, geo.ts (location rounding)
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

| Variable             | Type                                         | Default          | Purpose                                                                                                                                  |
| -------------------- | -------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | `development`, `production`, or `test`       | `development`    | Runtime mode                                                                                                                             |
| `PORT`               | integer 1 to 65535                           | `3000`           | Port the server listens on                                                                                                               |
| `DATABASE_URL`       | URL with `postgres:` or `postgresql:` scheme | required         | Neon direct (non-pooled) connection string, `sslmode=require`                                                                            |
| `BETTER_AUTH_SECRET` | string, at least 32 characters               | required         | Signs sessions and cookies                                                                                                               |
| `BETTER_AUTH_URL`    | URL                                          | required         | Public origin of the app (`http://localhost:5173` in development); also the only trusted origin. Cookies are `Secure` when it is `https` |
| `RESEND_API_KEY`     | string starting `re_`                        | required         | Resend API key for sign-in emails                                                                                                        |
| `EMAIL_FROM`         | non-empty string                             | required         | Sender, for example `Drop <onboarding@resend.dev>`                                                                                       |
| `SENDER_KEY_SECRET`  | string, at least 32 characters               | required         | Key for the HMAC of sender IPs and device ids. Changing it breaks the continuity of stored sender keys                                   |
| `LOCATIONIQ_API_KEY` | string starting `pk.`                        | required         | LocationIQ reverse geocoding. Travels in the query string, so URLs are never logged                                                      |
| `TILES_DIR`          | path, optional                               | `drop-app/tiles` | Folder served at `/tiles`. Empty or unset uses the default. Resolved to an absolute path at boot                                         |

## Endpoints

All responses use the envelope `{ "data": ..., "error": null }` or `{ "data": null, "error": { "code", "message" } }`.

| Method    | Path                                        | Response                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET       | `/api/v1/health`                            | `200`, `data: { status: "ok" }`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| GET       | `/api/v1/ready`                             | `200`, `data: { status: "ready" }`; `503`, `error.code: "NOT_READY"` when the database cannot be reached (no detail)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| POST      | `/api/auth/email-otp/send-verification-otp` | Better Auth. Body `{ email, type: "sign-in" }`. `200 { success: true }`; `429` over the limit                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| POST      | `/api/auth/sign-in/email-otp`               | Better Auth. Body `{ email, otp }`. Sets the session cookie                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| GET       | `/api/auth/get-session`                     | Better Auth. `200`, `null` when signed out                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| GET       | `/api/v1/profiles/:username`                | `200 { username, displayName, avatarUrl, acceptingDrops }`; `404 NOT_FOUND` (unknown, invalid or reserved name)                                                                                                                                                                                                                                                                                                                                                                                                                      |
| GET       | `/api/v1/me/profile`                        | Signed in. `200` own profile (public fields plus `heatmapEnabled`, `notifyEmail`, `createdAt`); `401 UNAUTHORIZED`; `404 NOT_FOUND` before a profile exists                                                                                                                                                                                                                                                                                                                                                                          |
| POST      | `/api/v1/me/profile`                        | Signed in. Body `{ username, displayName }`. `201` own profile; `409 USERNAME_TAKEN` ("That name is taken."); `409 PROFILE_EXISTS`; `422 VALIDATION_ERROR` (first message); `413 PAYLOAD_TOO_LARGE` over 4 KB                                                                                                                                                                                                                                                                                                                        |
| PATCH     | `/api/v1/me/profile`                        | Signed in. Body with at least one of `displayName`, `acceptingDrops`, `heatmapEnabled`, `notifyEmail`. `200`; `422`; `404`; `413`                                                                                                                                                                                                                                                                                                                                                                                                    |
| POST      | `/api/v1/profiles/:username/drops`          | Public. Multipart form: `message` (1 to 280 code points, trimmed, no NUL), required `latitude`, `longitude` and `location_source` (`gps` only). `201 { delivered: true }`, `Cache-Control: no-store`. `403 FORBIDDEN` foreign Origin; `404 NOT_FOUND`; `409 LINK_PAUSED`; `413 PAYLOAD_TOO_LARGE` over 16 KB; `422 VALIDATION_ERROR` (first message, also a non-multipart body; a missing or partial location, or any source other than `gps`, gives "Turn on your location to send a drop."); `429 RATE_LIMITED` with `Retry-After` |
| GET       | `/:username`                                | Link preview. The built `index.html` with `<title>` and Open Graph tags for a live profile, `Cache-Control: no-cache`. Unknown, reserved or invalid names fall through to the SPA fallback                                                                                                                                                                                                                                                                                                                                           |
| GET, HEAD | `/tiles/*`                                  | Map files from `TILES_DIR`. `206` for a `Range` request. `Accept-Ranges: bytes`, `Cache-Control: public, max-age=86400`. A missing file is a plain-text `404`, never `index.html`. `..`, `%` and backslashes in the path are refused. Own limit of 600 requests per minute per IP, `429` with `Retry-After`. No auth, no CSRF                                                                                                                                                                                                        |
| any       | `/api/*` (unmatched)                        | `404`, `error.code: "NOT_FOUND"`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| GET       | any other path                              | Static file from `frontend/dist`, or `index.html`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

Health, ready, `/api/auth/*` and `/api/v1/me/*` send `Cache-Control: no-store`. Unexpected errors answer `500 INTERNAL_ERROR` "Something went wrong" through `shared/errors.ts`; domain errors use `AppError(status, code, message)`.

Validation messages (exported from `profiles/model.ts`, mirrored by the frontend): "Use 3 to 30 letters, numbers, dots or underscores.", "That name is reserved.", "That name is taken.", "Enter a display name up to 50 characters.", "Send at least one field to update.". Reserved usernames: api, admin, sign-in, signin, sign-up, signup, claim, home, inbox, settings, playground, help, about, terms, privacy, safety, drop, drops, me, profile, profiles, login, logout, auth, support, static, assets, brand, landing, marble, favicon.svg, icons.svg, index.html, robots.txt.

Send validation messages (`drops/model.ts`): "Write a message up to 280 characters.", "That location is not valid." (coordinates out of range or malformed), "Turn on your location to send a drop." (`LOCATION_REQUIRED_MESSAGE`: location missing, partial, or not from GPS), "This link is not taking drops right now." (`LINK_PAUSED`). The device cookie is `__Host-drop_device` when `BETTER_AUTH_URL` is https, `drop_device` otherwise. The frontend loads map files from same-origin URLs such as `/tiles/philippines.pmtiles`, `/tiles/fonts/{fontstack}/{range}.pbf` and `/tiles/sprites/v4/light`.

## Middleware order

`index.ts`: global error handler; security headers on all paths; `/api/*` rate limiter; `/api/*` session middleware (sets `c.var.user` and `c.var.session`, null when signed out; `requireUser` answers `401`); auth router; health router; profiles router; drops router; `/api/*` 404; tiles router at `/tiles`; static files; link preview router (`GET /:username`); `index.html` fallback. The device cookie middleware runs on `/api/v1/profiles/*` and sets `c.var.deviceId`, so the first profile read sets the cookie. The drops router checks Origin (Hono `csrf`, a foreign Origin answers `403 FORBIDDEN` in the envelope), then the 16 KB body limit, then the content type, then parses the multipart body, then calls the service.

Send service order (`drops/service.ts`): resolve the recipient (`404`, then `409 LINK_PAUSED`), rate limit, validate (`422`), round the location, look up the place name (a failure gives a null name), insert in a transaction that locks the profile row `FOR SHARE` and re-checks `accepting_drops`. Slots are left for the block check (module 11), text moderation (deferred), photos (module 08) and the notification (module 10).

## Security headers

`middleware/security-headers.ts` (Hono `secureHeaders`): `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, plus Hono defaults (COOP and CORP same-origin). Content Security Policy: `default-src self`; `script-src self`; `style-src self`; `font-src self`; `img-src self data: blob:`; `connect-src self`; `worker-src self blob:`; `object-src none`; `base-uri self`; `form-action self`; `frame-ancestors none`. The built landing page runs under it with no violations in Edge at 390 and 1280 px.

## Auth

`auth/auth.ts` (Better Auth, `basePath /api/auth`, Drizzle adapter, `trustedOrigins` = `BETTER_AUTH_URL`, telemetry off): email password disabled; `emailOTP` plugin (6 digits, 300 s expiry, 3 attempts, sends only for `sign-in` through `auth/mailer.ts` and Resend). Session lifetime 7 days, refreshed after 1 day. Cookies `httpOnly`, `SameSite=Lax`, `Secure` when `BETTER_AUTH_URL` is https. Better Auth rate limit on in every environment, in memory: 30 per 60 s per path, `send-verification-otp` 3 per 60 s, `sign-in/email-otp` 10 per 60 s. The auth router overwrites `x-forwarded-for` with the socket address so the limits count real clients; behind a proxy this must change to the trusted proxy address. Codes and email addresses are never logged.

## Tables

Migration `0002_drops`: `drops` (message varchar 280, `location` geography(Point,4326) holding the rounded cell centre, `location_source`, `location_name`, `sender_key` and `device_key` char 64 keyed hashes, `is_read`, `created_at`; check `drops_location_source_check`; indexes `drops_recipient_created_idx` and GIST `drops_location_gist`) and `place_names` (`cell_key` pk, `name` nullable, `fetched_at` indexed). No `photo_key` yet (module 08).

Migration `0003_productive_norrin_radd`: `drops.location` and `drops.location_source` become NOT NULL, `drops_location_source_check` allows only `gps`, `drops_location_pair_check` is dropped (both columns are now required). Drizzle Kit wrote the geography type unquoted this time; no hand edit.

Hand edit to `0002_drops.sql`: Drizzle Kit 0.31.11 quotes custom types it does not know, so it wrote `"geography(Point,4326)"` for the `location` column. The quotes were removed by hand (the snapshot is unchanged). Repeat this edit if the migration is ever regenerated.

Migration `0001`: `user`, `session`, `account`, `verification` (Better Auth, generated with `@better-auth/cli@1.4.22`) and `profiles` per PRD section 5 (`username` citext unique, `user_id` unique with cascade delete, `age_confirmed_at` timestamptz, nullable since `0004`).

Migration `0004_fixed_obadiah_stane`: `profiles.age_confirmed_at` drops NOT NULL. The column is kept so existing dates survive. New profiles leave it empty, and nothing reads it.

## Rate limiting

`src/shared/fixed-window.ts` is the shared counter (`peek`, `hit`, injectable clock, pruned on an unref'd timer). Everything below is held in memory, per instance, and reset on restart. IPs come from `getConnInfo`, no proxy headers.

- `src/middleware/rate-limit.ts`, applied to `/api/*`: 60 requests per minute per IP. Over the limit: `429`, `error.code: "RATE_LIMITED"`, `Retry-After` in seconds.
- `drops/limits.ts`, inside the send service: 60 per hour per IP, 30 per hour per device, 5 per 15 minutes per device and recipient. A send is counted only when all three have room. Over the limit it throws `AppError(429)` with the longest wait, and the global handler sets `Retry-After`. Only hashed keys are held.
- `middleware/tiles.ts`: 600 per minute per IP on `/tiles/*`, outside the API limiters.

Sender keys (`drops/keys.ts`): HMAC-SHA256 hex of `ip:` plus the normalized IP (IPv4-mapped IPv6 reduced to IPv4, other IPv6 reduced to its /64), and of `device:` plus the device id, keyed by `SENDER_KEY_SECRET`.

## Location and places

`shared/geo.ts` `snapToGrid` rounds a point to the centre of a 150 m cell (latitude step 150/111320 degrees, longitude step widened by the cosine of the cell latitude, 6 decimals) and returns the cell key `<i>:<j>`. Only the centre is stored. `places/service.ts` returns the cached name for a cell if it is under 48 hours old (a cached null counts), otherwise asks LocationIQ (`us1.locationiq.com/v1/reverse`, 2.5 s timeout), caches the answer and deletes expired rows. Any failure gives a null name and caches nothing. The name is the place name, else neighbourhood, else suburb, plus the city, never a road or house number.

## Map files

`middleware/tiles.ts` serves `TILES_DIR` (git-ignored `drop-app/tiles/` by default) at `/tiles` with Hono's `serveStatic` from `@hono/node-server`. No compression is applied, so range responses are never gzipped. Content types: `.pmtiles` octet-stream, `.pbf` x-protobuf, `.json`, `.png`. The CSP lists no extra origin because everything loads from `self`. The server logs a one-line warning at boot when the folder does not exist. How to fill the folder (the extract, fonts and sprites) is in [frontend.md](frontend.md).

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
