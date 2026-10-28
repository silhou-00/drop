# Backend Changelog

## October 29, 2026

**Auth and profiles:**

- People can now sign in with a six-digit email code, claim a link name with an 18 or older confirmation, view and update their own profile, and anyone can look up a public profile. The server also sends security headers and limits how fast sign-in codes can be requested.

**Database:**

- The server now connects to the database, reports whether it is ready, limits how fast any one visitor can call the API, and shuts down cleanly. The database is prepared for map data and case-insensitive text.

## October 27, 2026

**Documentation:**

- Added the system overview, the technical reference for both sides, and the first progress document.

**Project scaffold:**

- The server starts as one service that answers a health check under the API and serves the web app for every other address.
