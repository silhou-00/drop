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

## License

All rights reserved. The source is public to read, not to reuse. See [LICENSE](LICENSE)
and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
