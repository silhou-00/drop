# Backend Changelog

## October 31, 2026

**Profiles:**

- The name map is now reserved for the app's map page.

## October 30, 2026

**Inbox:**

- The inbox can be filtered to unread drops or drops with photos, and reports how many drops are unread.
- A photo whose file is missing now answers "not found" instead of a server error.
- Signed-in people can now list their drops page by page, open one, mark it read or unread, delete it, and view its photo, all limited to their own drops.

**Photos:**

- Senders can attach a photo to a drop; the server removes hidden data like GPS, shrinks it, and stores it privately.

**Profiles:**

- Anyone can claim a link; sign-up no longer asks for an age confirmation.

**Send page:**

- Every drop now carries the sender's GPS location, rounded to about 150 m.

## October 29, 2026

**Send page:**

- Anyone can now send an anonymous drop to a public link, with an optional location that is rounded to a neighbourhood sized area and given a place name. Sending is limited per visitor, per device and per recipient. Shared links show a preview with the person's name, and the map files are served by the app itself.

**Auth and profiles:**

- People can now sign in with a six-digit email code, claim a link name with an 18 or older confirmation, view and update their own profile, and anyone can look up a public profile. The server also sends security headers and limits how fast sign-in codes can be requested.

**Database:**

- The server now connects to the database, reports whether it is ready, limits how fast any one visitor can call the API, and shuts down cleanly. The database is prepared for map data and case-insensitive text.

## October 27, 2026

**Documentation:**

- Added the system overview, the technical reference for both sides, and the first progress document.

**Project scaffold:**

- The server starts as one service that answers a health check under the API and serves the web app for every other address.
