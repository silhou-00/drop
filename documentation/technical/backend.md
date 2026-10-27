# Backend Technical Reference

## Layout

```
backend/
├── src/
│   ├── index.ts          entry point: API routes, static frontend, server start
│   └── config/env.ts     environment validation, exports `config`
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

## Environment variables

Validated at boot by `src/config/env.ts` (Zod). A bad value stops the process.

| Variable   | Type                                   | Default       | Purpose                    |
| ---------- | -------------------------------------- | ------------- | -------------------------- |
| `NODE_ENV` | `development`, `production`, or `test` | `development` | Runtime mode               |
| `PORT`     | integer 1 to 65535                     | `3000`        | Port the server listens on |

## Endpoints

All responses use the envelope `{ "data": ..., "error": null }` or `{ "data": null, "error": { "code", "message" } }`.

| Method | Path                 | Response                                          |
| ------ | -------------------- | ------------------------------------------------- |
| GET    | `/api/v1/health`     | `200`, `data: { status: "ok" }`                   |
| any    | `/api/*` (unmatched) | `404`, `error.code: "NOT_FOUND"`                  |
| GET    | any other path       | Static file from `frontend/dist`, or `index.html` |

## Versions

Pinned exactly (`save-exact=true`). Node 24.

| Package             | Version |
| ------------------- | ------- |
| `hono`              | 4.13.14 |
| `@hono/node-server` | 2.1.5   |
| `zod`               | 4.6.7   |
| `typescript`        | 7.0.2   |
| `tsx`               | 4.23.15 |
| `@types/node`       | 24.19.2 |

`esbuild` (pulled in by `tsx`) is the only package allowed to run install scripts (`onlyBuiltDependencies` in `pnpm-workspace.yaml`).
