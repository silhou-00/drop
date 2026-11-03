# Drop

Anonymous notes tied to real places.

Post your Drop link to your story. Friends open it and leave you an anonymous note of up to
280 characters, with a rough place and a photo as clues. You read them in a private inbox,
guess who sent each one, and share the best as a story card. Your link only takes notes
while a statement is up, two hours at a time.

## Privacy by design

- Nobody sees who sent a note.
- Places are rounded to about 150 m.
- Photo location data is removed before a photo is stored.
- Sender keys are cleared after 90 days.

## Stack

- **Frontend:** React, Vite, Tailwind CSS, MapLibre GL JS with PMTiles
- **Backend:** Node, Hono, TypeScript, Better Auth, Zod, Drizzle ORM
- **Data:** PostgreSQL with PostGIS, file storage for photos
- **Hosting:** one service that serves both the API and the web app

## Running it locally

Needs Node 24 and pnpm 10.

```
pnpm install
cp .env.example .env    # then fill in the values
pnpm db:migrate
pnpm dev:backend        # API on port 3000
pnpm dev:frontend       # web app, forwarding /api to port 3000
```

The map tiles are not in this repository. Put them in a `tiles/` folder at the root.

| Command                        | Does                               |
| ------------------------------ | ---------------------------------- |
| `pnpm build`                   | Build the web app, then the server |
| `pnpm start`                   | Run the built server               |
| `pnpm test`                    | Run the backend tests              |
| `pnpm lint` / `pnpm typecheck` | Lint and type check                |

## Documentation

- [documentation/](documentation/README.md): how the system works, in plain language
- [documentation/technical/](documentation/technical/): structure, settings, endpoints, commands
- [documentation/progress/](documentation/progress/): what was built, module by module

## License

All rights reserved. The source is public to read, not to reuse. See [LICENSE](LICENSE)
and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
