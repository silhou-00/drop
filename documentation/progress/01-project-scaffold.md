# 01 Project Scaffold

**Status:** Done
**Date:** October 27, 2026
**Traces to:** PRD section 4 (System Architecture & Tech Stack)

Technical detail: [backend](../technical/backend.md), [frontend](../technical/frontend.md).

## Goal

Set up the empty project so the web app and the server build and run together as one service, before any Drop features are added.

## What Was Built

- The project builds both the web app and the server with one command, and starts them as one service with another.
- The server answers a health check, which the hosting platform will use to know the app is alive.
- Any address that is not part of the server's programming interface receives the web app, so links like a person's profile page open correctly.
- The web app has its styling system, a library of ready-made accessible components, an icon set, and page routing in place, shown on a placeholder home page.
- The server checks its settings when it starts and refuses to run with a wrong one.

## Decisions & Trade-offs

- **One service instead of two.** The web app and the server come from the same address. This means one deployment, no cross-site setup, and login cookies that work without extra rules. The cost is that the server does not sit on a worldwide network by itself; a caching layer goes in front of it at deployment.
- **One shared workspace for both sides.** Both halves are installed together, so shared tools are downloaded once and the hosting platform needs one build command. The cost is a shared package folder at the top of the project.
- **Exact versions everywhere.** Every package is fixed to one version, so a fresh install today and in three months produces the same app.
- **No database yet.** The database account does not exist yet, so the database connection waits for the next module instead of being added unused.

## Security Pass

**Server**

- Are all inputs checked against a strict shape? The only endpoint, the health check, takes no input. The server's own settings are checked at start-up.
- Do protected endpoints check who is calling? There are no protected endpoints yet.
- Are database queries safe from injection? There is no database access yet.
- Are state-dependent writes checked inside a transaction? There are no writes yet.
- Is anything secret or personal logged or shown in an error? No. The only error is a plain "not found", and no secrets exist yet.
- Are endpoints rate-limited? The health check is left open on purpose: the hosting platform calls it and it reveals nothing. Limits arrive with the first endpoint that accepts input.

**Web app**

- Is any secret in the web app's code? No. No secrets exist yet, and only settings marked as public can ever reach the browser.
- Is any token or personal data kept in browser storage or a web address? No.
- Is server or user content shown as raw HTML? No content is shown yet.
- Are unchecked values placed in links, image sources, or styles? No.
- Do outside links carry the safe-link attributes? There are no outside links.
- Do forms block double submits? There are no forms yet.
- Does a failed sign-in hide which field was wrong? Sign-in does not exist yet.
- Was debug logging removed? Yes. The only log line is the server's start-up message.

**Not yet in place, and planned:** security headers with a content security policy, a central error handler, and rate limiting. They arrive with the first module that handles real requests.

## Verification

- Built both halves with one command; both succeeded.
- Ran lint, type checks, and the formatting check; all passed.
- Started the built service and requested four addresses: the health check answered "ok", an unknown programming-interface address answered "not found" in the agreed shape, and both the home page and a sample profile address returned the web app.

## Open Items

- Connect the database once the account exists.
- Add automated tests with the first module that has logic to test.
- Add linting for the server side.
