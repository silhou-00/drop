# 06 Auth and Profiles

**Status:** Done
**Date:** October 29, 2026
**Traces to:** PRD v2.2 sections 5, 6 and 7.7, and the decisions to sign in by email code only, send codes through Resend, and update the PRD to match

Technical detail: [backend](../technical/backend.md), [frontend](../technical/frontend.md).

## Goal

Let a person sign in and claim their own link. Signing in uses a six-digit code sent to their email. After signing in, they choose a link name and a display name. Anyone can then look up a public profile by link name.

## What Was Built

- Sign-in by email code. The server sends a six-digit code that works for five minutes and allows three wrong tries.
- A sign-in session that lasts seven days and is kept in a cookie the page's scripts cannot read.
- Creating a profile: link name and display name. The sign-up no longer asks for an age confirmation; confirmation dates saved earlier are kept.
- One profile per account, and one account per link name. The database itself settles two people claiming the same name at the same moment.
- Reading and updating your own profile: display name, pausing the link, the map heat view, and email notifications.
- A public profile lookup that shows only the display name, the avatar slot (empty for now) and whether the link accepts drops.
- A list of reserved names (such as admin, settings or privacy) that nobody can claim, and a 404 when someone looks one up.
- Stricter limits on the sign-in routes than on the rest of the API.
- Security headers on every response, including a content policy the current web app runs under with no violations.
- Automated tests for the input rules and the profile routes, and a database test that proves a duplicate link name is refused.
- A sign-in page in two steps: an email, then the six-digit code. Pasting the code works, a new code can be asked for once a minute with the wait shown, and a different email can be used.
- A claim page: the link name is checked as it is typed (format, reserved names, already taken), then a display name. A name taken in the meantime shows on the name field.
- A simple home page with the person's link, a copy button, their display name and sign out. The inbox replaces it in a later module.
- The landing's claim step now checks the name the same way and takes a free name on to sign-in, where it is carried through to the claim page. The "sign-up opens soon" message is gone.
- Pages that need a signed-in person send everyone else to sign-in, and people are sent to claim or home depending on whether they already have a profile.
- All three pages sit on the marbled background with one paper card, work from phone width up to wide screens, and appear without movement for people who ask for reduced motion.

## Decisions & Trade-offs

- **Email code instead of Google sign-in.** Many visitors arrive from the in-app browsers of social apps, where Google sign-in often fails or is blocked. An email code works everywhere. Google sign-in can be added later.
- **Server sessions instead of short-lived tokens.** The security rules ask for short-lived access tokens that are replaced often. A server session meets the same goal: the cookie holds only a random reference, the server can cancel it at any time, and it is renewed daily. Nothing readable by scripts holds the user's identity.
- **Cookie rule is "Lax", not "Strict".** Strict cookies are not sent when someone arrives from a link in another app, so a person tapping Drop from a story would look signed out. Lax is still blocked on cross-site form posts and writes, and the server also checks the request origin.
- **Resend development limit.** Until a domain is verified in Resend, codes can only be delivered to the Resend account owner's address. Resend's test address was used to check sending.
- **Reserved names.** App paths and common official-sounding words cannot be claimed, so a profile can never collide with a page of the app. Names are compared ignoring capital letters.
- **Client address for limits.** The auth library found no client address on its own and fell back to one shared counter for everyone, so one visitor could block all sign-ins. The server now passes the real connection address and ignores any address the visitor sends.
- **Strictest content policy worked.** The web app ran under a policy that allows only its own files (plus inline images from data and blob sources), so nothing had to be loosened.
- **The web app repeats the server's name rules.** The rules and their messages are copied on the web side so a bad name is caught before any request, and the same input fails with the same words everywhere. The server still decides.
- **A free name is found by looking it up.** The availability check asks for the public profile: "not found" means free. No extra endpoint was needed, and reserved names never get that far.
- **One message for every failed code.** A wrong code, an expired code and too many tries all read the same, and the page never says whether an email has an account.
- **The link is shown as text only.** It is built from the checked name, never turned into a clickable address from server data. Copy puts the full address on the clipboard.
- **Page checks are for convenience.** The pages check the session before showing, but the server checks it again on every request.
- **October 30, 2026: the age confirmation was removed when the audience changed to Accessible by All; see 07 Open Items.**

## Security Pass

**Server**

- Is every input checked against a strict shape? Yes. Create and update bodies reject unknown fields and enforce length and type limits. Sign-up no longer takes an age confirmation, and a body that still sends one is rejected as an unknown field. The link name in the public lookup is validated, and invalid names answer 404. Bodies on the profile routes are capped at 4 KB.
- Do protected endpoints check who is calling? Yes. Own-profile routes need a signed-in user, checked on the server for every request. Each action uses the signed-in user's id, never an id from the request.
- Are queries safe from injection? Yes, all queries go through the query builder with bound values.
- Are state-dependent writes checked inside the transaction? The only such write is claiming a link name, and it relies on the database's unique rules rather than a check-then-write, so races are settled by the database.
- Is anything secret or personal logged or shown in an error? No. Email addresses and codes are never logged; a failed email logs a short error name only. Unexpected errors answer with a plain message and log only the error name. Configuration errors list field names, never values.
- Are endpoints rate-limited? Yes. All API paths share the general limit. The auth library adds 30 per minute overall, 3 code requests per minute and 10 code checks per minute per client. Over the limit gives 429.
- Password rules, hashing and lockout? Not applicable: there are no passwords. Codes allow three tries and expire in five minutes.
- CSRF? Cookies are Lax and the auth library checks the origin against the allowed list.
- Headers? Strict-Transport-Security, nosniff, frame denial, referrer policy and a Content Security Policy are set on all responses. Auth and own-profile responses carry no-store.

**Web app**

- Is any secret in the web app or a browser-visible setting? No. The release build was searched for the mail key name and prefix, database addresses and the developer tools library with no matches. The auth library carries the name of the server secret setting in a helper that reads server settings; in the browser it reads nothing and no value is present.
- Is any token, credential or personal data in browser storage or the address bar? No. The session lives only in the cookie scripts cannot read. Only the chosen link name travels in the address, and it is checked against the name rule on arrival and dropped if it fails.
- Is server or user content ever rendered as raw markup? No. Every message and name is shown as plain text.
- Is any unchecked value put into a link, image source or style? No. The home page shows the link as text built from the checked name, with no clickable address.
- Do external links carry the safe link attributes? There are no external links on these pages.
- Does every form have a submit lock? Yes. Sending a code, checking a code, a new code, claiming, the landing claim step and sign out each fire once on a double click; this was checked by counting requests.
- Does a failed sign-in hide whether the email exists? Yes. After sending, the page says "If that email can sign in, a code is on its way." Every wrong or expired code gets "That code did not work. Check it or send a new one."
- Is debug logging removed? Yes, there is none.
- Too many requests: the pages show "Try again in N seconds" from the server's wait time.

## Verification

- Type check, lint, build, format check and the automated tests pass (29 passed, 1 database test skipped by default).
- The database test was run once against the development database: a second profile with the same name was refused, and a second profile for the same account was refused.
- A built server was run. A code request to Resend's test address succeeded; the fourth in a minute got 429. A sign-in check without a cookie answered empty. Own profile answered 401, an unknown profile answered 404, a reserved name answered 404. Security headers were present.
- The landing page loaded at phone and desktop widths in Edge with no console errors and no policy violations.
- Web app: lint (no warnings), type check, build, format check and the automated tests pass.
- Browser checks in Edge against the built server, which sends the content policy, at phone (390) and desktop (1280) widths, with the server answers simulated: 125 checks passed, none failed. They covered every message and state above (code sent, wrong code, too many tries with the wait, invalid, reserved and taken names, a rejected form, a name taken at the last moment, created and sent home, sign out), the page redirects, keyboard-only use of sign-in and claim (visible focus, Enter submits, no focus traps), one request per double click, reduced motion, no console errors, no policy violations and no sideways scrolling. Tablet (768) and full HD (1920) were captured as pictures and checked for the same.
- Against the real server with no simulation: a code request to Resend's test address moved the page to the code step, the claim and home pages sent a signed-out visitor to sign-in, and the landing claim step reported too short, reserved and free names correctly.
- The development server pair (web app on its own port forwarding to the API) was not run, because the API's usual port was held by an older process.

## Open Items

- Buy a domain and verify it in Resend before launch, so codes reach every user.
- Google sign-in later.
- Behind the hosting proxy, use the trusted proxy address for both rate limiters.
- Avatar upload arrives with the file storage module.
- The full sign-in with a real code has not been done in a browser yet: codes reach only the Resend account owner until a domain is verified. The owner runs it by hand.
- The landing's "Sign in" links still scroll to the claim section; pointing them at the sign-in page is a small follow-up.
- Own profile settings (display name, pause, heat view, notifications) arrive with the settings page; the update call is already in place.
- Terms of Service and Privacy Policy pages do not exist yet; the claim page names them as plain text.
