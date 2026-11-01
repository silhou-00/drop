# 14 Supabase move

**Status:** Done
**Date:** November 1, 2026
**Traces to:** PRD v3.2, section 4.1 (stack), section 7.3 (sender keys), Open Questions 6, 8, 11 and 13

Technical detail: [backend](../technical/backend.md), [frontend](../technical/frontend.md).

## Goal

Move Drop's data and photos to one provider, Supabase, in Singapore, close to the people who use the app. The same change locks the database down, makes the promise to clear sender codes after 90 days real, and makes the Privacy page say what is now true.

## What Was Built

- The database lives on Supabase. The server connects over an encrypted connection and only trusts Supabase's own certificate.
- Photos are stored in a private Supabase bucket instead of the server's disk. The bucket takes small WebP images only. Photos still reach their owner only through the server, which checks who is asking.
- On a developer's machine the server still keeps photos in a local folder when Supabase is not set up. In production, the server refuses to start unless Supabase is set up.
- Every table now has row level security switched on, with no rules, and the public Supabase roles lose all rights. The server connects as the owner of the tables, so it keeps working, and nobody else can read the data through Supabase's own web interfaces.
- A daily job inside the database clears the scrambled sender codes on drops older than 90 days. To allow that, the sender code on a drop can now be empty.
- The Privacy page names Supabase and Singapore, says the sender codes are cleared after 90 days, and says plainly that Drop keeps no backup copies.

## Decisions & Trade-offs

- **One place for data.** Keeping the database and photos with one provider means one account, one bill, one set of rules to secure.
- **The Free plan means no backups.** Anything deleted or lost cannot be brought back. The Free plan also pauses a project after a week with no use, so the first visit after a long quiet spell can be slow or fail until it is woken.
- **No automatic text or photo check at launch.** This is the owner's decision because there is no budget for a paid checking service. Drop text, statements and photos are stored unchecked. It stays listed as an open risk.
- **A local database for development is planned later.** Until then, development points at the live database, so the database tests must never run against it.
- **Locking down with no rules.** Switching row level security on with no rules is the strictest setting. The server is the only door, and it already checks every request itself.
- **The clearing job runs in the database.** It keeps working even when the server is down, and needs no extra service.

## Security Pass

- **Is any secret in the source code?** No. The new storage key is read from the environment, is marked server only, and has no browser prefix.
- **Is `.env` ignored and are the example keys placeholders?** Yes. The example file holds placeholder values only.
- **Is new configuration checked at startup?** Yes. The storage address and key must be well formed, must be set together, and are required in production. The error names the setting, never the value.
- **Is any secret logged or shown in an error?** No. Storage failures report the status number only, never the key, the file name or the request headers.
- **Does any secret reach the browser bundle?** No. The storage key is read only by the server.
- **Is every input checked against a strict schema?** The new code takes no new input from people. File names are checked against a strict pattern before any storage request is made.
- **Is user content rendered as HTML?** No. The Privacy page change is fixed text.
- **Are all database queries parameterized?** Yes. The migrations contain no user input. The scheduled job is fixed text.
- **Are sign-in rules, roles and lockouts affected?** No change. Checks stay on the server, as before.
- **Are transport protections affected?** The database connection is encrypted and pinned to Supabase's certificate. The storage calls use HTTPS and time out after 10 seconds.
- **Is rate limiting affected?** No change.
- **Does the module add state-dependent writes?** No. The daily job only clears old codes, and it is safe to run twice.
- **Is the data exposed through Supabase's own interfaces?** Not any more: row level security is on, the public roles have no rights, and the Data API is off.
- **Frontend: any secret, token or personal data in browser storage or a query string?** No.
- **Frontend: any raw HTML, unvalidated link target or missing `rel` on an external link?** No. The change is plain text inside existing list items.
- **Frontend: forms and debug logging?** No form was added or changed, and no debug logging was added.
- **Anything found and fixed?** The sender codes were promised to be cleared after 90 days, but nothing did it. The daily job now does.

## Verification

- Format, lint, type check, tests and the frontend build pass. New tests cover the storage code with a fake network: the request sent, the bytes read back, a missing file, removing a missing file, bad names refused before any request, and errors that never reveal the key.
- The database tests were not run, because they would write to the live database.
- The two new migrations were checked by reading. They are applied to the live database after review.

## Open Items

- A local development database, so development no longer touches the live one and the database tests can run safely.
- Automatic text and photo checks, when there is budget.
- The Pro plan, for backups and no pausing.
- Supabase Free limits: 500 MB for the database and 1 GB for files. Watch usage as the app grows.
- The Privacy page "Last updated" date and the lawyer's review of the legal pages are still to do.
