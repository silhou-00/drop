# 05 Database

**Status:** Done
**Date:** October 29, 2026
**Traces to:** PRD sections 4 and 5, and the request to set up the database groundwork

Technical detail: [backend](../technical/backend.md).

## Goal

Give the server a way to reach its database, and a way to tell the hosting platform whether it can. Prepare the database for map data and for text that ignores capital letters. No Drop data is stored yet.

## What Was Built

- The server connects to the project's database and keeps a small shared set of connections ready for use.
- A "ready" check that says whether the database can be reached. If it cannot, it answers "not ready" and gives no detail about why.
- The existing "health" check moved into its own area and now sits beside the ready check.
- A limit on how fast one visitor can call the API: 60 requests a minute. Past that, the server asks the visitor to wait and says how long.
- A clean shutdown: when the server is told to stop, it stops taking new visits and closes its database connections first.
- A first database change that switches on map support and case-insensitive text. It was applied to the development copy of the database and checked.
- Commands to create and apply database changes, and to run the tests.
- Automated tests for the health and ready checks and for the visitor limit.

## Decisions & Trade-offs

- **No tables yet.** Each feature (accounts, drops, blocks, reports) adds its own tables when it is built, so nothing sits in the database without code that uses it.
- **A standard database driver, not Neon's own web driver.** The server is one long-running service, so a normal connection pool fits and keeps the code portable.
- **One direct connection address.** Not the shared pooled address Neon also offers. The server already pools its own connections, and the direct address works with the tools that change the database.
- **Everything runs against Neon's "development" copy.** Production gets its own address later.
- **Database changes are applied by hand, not when the server starts.** This stops a bad change from running by surprise or twice at once.
- **Neon puts idle databases to sleep.** A connection can drop while asleep. The server logs only an error code and carries on, and the next request reconnects.
- **The visitor limit is simple and kept in memory.** It is enough for one instance and avoids a new service.

## Security Pass

**Server**

- Are all inputs checked against a strict shape? Yes for configuration: the database address must be a valid database URL. No request input is read by the new endpoints.
- Do protected endpoints check who is calling? Not applicable. Health and ready are public by design and reveal nothing about the database.
- Are database queries safe from injection? Yes. The only query is a fixed check with no outside input, and the library parameterizes by default.
- Are state-dependent writes checked inside a transaction? Not applicable, nothing is written.
- Is anything secret or personal logged or shown in an error? No. A bad database address reports only that the field is invalid, never its value. Database errors log only a code. The ready check shows no detail. Testing confirmed this.
- Are endpoints rate-limited? Yes, all API paths, 60 requests a minute per visitor address. Sign-in routes will get a stricter limit when they are built.

**Web app**

- Is any secret in the web app's code? No. The release build was searched for the database variable name and for database addresses with no matches.
- Is any token or personal data kept in browser storage or a web address? Not applicable, no web app change.
- Is server or user content shown as raw HTML? Not applicable.
- Are unchecked values placed in links, image sources, or styles? Not applicable.
- Do outside links carry the safe-link attributes? Not applicable.
- Do forms block double submits? Not applicable.
- Does a failed sign-in hide which field was wrong? Not applicable.
- Was debug logging removed? Yes, none was added.

## Verification

- Type check, lint, build and formatting checks pass. The four automated tests pass.
- The database change was applied to the development database. Map support and case-insensitive text were confirmed present.
- A running server answered health and ready with success. A second server pointed at an unreachable database answered "not ready" with no detail and stayed running.
- Starting with a malformed database address stopped the server at once with a message that did not contain the address.
- The 61st request in a minute was refused with a wait time.
- The built web app contains no database address or variable name.

## Open Items

- Behind the hosting proxy every visitor may appear to have the same address. The limiter needs to read the real visitor address from a trusted proxy at deploy time.
- The production database address goes into the hosting platform's settings at deploy time.
- The limiter forgets its counts when the server restarts, and each running copy counts separately.
- The database driver warns that the "require" connection mode will change meaning in a future version. Revisit the address options when the driver is upgraded.
