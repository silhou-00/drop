# Backend Changelog

## November 1, 2026

**Storage:**

- Photos can now be kept in a private Supabase bucket, and the server requires it in production.

**Database:**

- The database moves to Supabase: every table is locked down with row level security, the public Supabase roles lose their rights, and sender codes on drops are cleared after 90 days by a daily job.

**Documentation:**

- The PRD, technical reference and progress notes describe the Supabase move and the choice to launch without an automatic text or photo check.

**Database:**

- The server and the migration command can now require an encrypted database connection checked against a given certificate, ready for the move to Supabase.

**Documentation:**

- The technical reference, design reference and progress notes now describe the restyled statement controls, the legal page buttons, and the bottom bar on tablets.

## October 31, 2026

**Accounts:**

- People can now delete their own account from Settings. It removes their profile, statements and every drop sent to them, with its photos, and signs them out on every device. They must type their link name to confirm.
- A deleted link name is held for 30 days before anyone else can claim it.

**Statements:**

- A link now takes drops only while its owner has a statement running. A statement is one short line that opens the link for two hours, and the owner can end it early. Each drop is filed under the statement that was running, and the inbox can show them by statement. The pause switch is gone.
- Every request that changes data, including marking a drop read and deleting one, is now checked to come from this site, whatever its content type.

**Documentation:**

- The product requirements, the technical reference and the progress notes now describe account deletion, held link names, the legal pages and the contact address setting.
- The product requirements, the technical reference and the progress notes now describe statements.

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
