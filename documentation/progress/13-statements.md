# 13 Statements

**Status:** Done
**Date:** October 31, 2026
**Traces to:** PRD v3.0 Epic 2 (US-2.6, US-2.8), Epic 3 (US-3.1), How Drop Works steps 2, 3 and 12, module 13a

Technical detail: [backend](../technical/backend.md), [frontend](../technical/frontend.md), [design](../technical/design.md).

## Goal

Make a link take drops only while its owner has a statement running. A statement is one short line the owner writes, such as "Ask me anything about finals week", and it opens the link for two hours. When the time is up, or the owner ends it early, the link closes. Senders see the statement, so a drop is a reply to something. The owner sees their drops grouped under the statement that brought them in.

This replaces the old pause switch. A link used to be open until its owner paused it, and the pause was never shown on any screen. Now a link is closed by default and open only by choice.

## What Was Built

- An owner can start a statement from My link: one line of up to 120 characters, with a live count. Starting it opens the link for two hours.
- Starting a new statement while one is running ends the running one first. The form says so before the owner commits.
- An owner can end a statement early. A short in-page question asks first, and a double click ends it once.
- My link shows the running statement with a live countdown, how many drops it has brought so far, and an "End now" button. The countdown never asks the server for the time. It counts down on the screen and stops at zero.
- A sender who opens the link sees the statement in a quoted card with how long the link stays open, then the form. When the time runs out while the page is open, the page switches to the closed message by itself. If the owner ends the statement while a sender is writing, the send is turned away with the closed message and nothing is stored.
- A closed link shows "[Name] is not taking drops right now" and a button to get a link of one's own.
- A closed link does not use up a sender's send limits, because the server checks that the link is open before it counts anything.
- Every new drop is filed under the statement that was running when it arrived. The sender cannot choose the statement, and a request that tries is refused.
- The inbox shows one section per statement, newest first, each with the statement, when it started, how many drops it brought, and a "Live" mark while it runs. Drops sent before statements existed sit in an "Earlier" section at the end.
- "Only this one" on a section narrows the inbox to that statement, and "Show all" brings the rest back. This works together with the All, Unread and Photos chips.
- A strip at the top of the inbox says "Live" with the statement and time left, or says the link is closed and points to My link.
- The map has a statement picker next to the chips, listing each statement with its drop count and "Earlier". Choosing one narrows the pins and the list.
- The story image made from My link now carries the statement instead of a fixed line. When the link is closed, My link keeps the Copy button and hides the preview and Share, because sharing a closed link would waste the story.
- The empty states in the inbox and on the map now point to My link instead of offering to share a closed link.
- The link preview that chat apps show does not include the statement. Chat apps keep previews long after a two-hour statement ends.
- The old pause switch, its stored setting and its error name are gone.

## Decisions & Trade-offs

- **The database clock decides whether a statement is running.** A statement is running while it has not been ended and its end time is still ahead. No background job closes statements, and a wrong clock on a phone cannot keep a link open.
- **Only one statement runs per owner, and the database enforces it.** Starting one locks the owner's profile, closes the open one and opens the new one in a single step. A second safeguard in the database rejects two open statements even if the first were somehow bypassed.
- **A statement that runs out keeps its true end time.** When a new statement closes an old one that had already run out, the old one is recorded as ended at its own end time, not at the moment of the new start.
- **The server files each drop under a statement, never the sender.** The server picks the running statement inside the same step that stores the drop. Ending a statement and sending a drop cannot slip past each other: a send either lands in the statement before it ends or is turned away.
- **The statement text is not in link previews.** Chat apps cache previews for a long time, and statement text has no content check yet.
- **The countdown trusts the server's "seconds left", not the phone's clock.** The page works out its own deadline once when the answer arrives.
- **Section data arrives with each page of drops.** No separate request is needed, and nothing is fetched that goes unused. A past statement that got no drops does not appear in the inbox. A statement history screen can be added later if one is wanted.
- **Statements are kept when a drop is deleted, and drops are kept if a statement is ever removed.** A statement is never deleted on its own. If the owner's profile goes, its statements go with it.
- **Two hours and 120 characters were chosen to suit a headline and the story image.** Starting or ending statements is limited to ten actions in fifteen minutes per owner.
- **The old "Today" and "Earlier" day grouping in the inbox is replaced by statement sections.** "Earlier" now means drops from before statements.
- **The same-origin check was strengthened here, and it fixes an existing gap.** The old check only looked at form posts, so a JSON request that changed a drop (mark read, delete) from another site was not checked. The new check covers every request that changes data, whatever its content type, and is used on both the drops and the statements routes.
- **The per-owner request limiter is now shared.** The statements routes needed the same limiter the inbox uses, with a longer window, so it moved to shared code.
- **Every current owner's link closed when this shipped.** No one had a statement yet. This is fine before launch.

## Security Pass

**Server**

- Is every input checked against a strict shape? Yes. The statement text must be 1 to 120 characters after extra spaces and line breaks are collapsed, with no control characters. The end request must say exactly that it ends the statement, and nothing else. A statement id that is not the right shape gets the same "not found" as a missing one. The statement filter on the inbox must be an id or the word "earlier". A sender who adds a statement field to a drop is refused. Statement bodies are capped at 1 KB.
- Does every protected endpoint check who is calling and whether they are allowed? Yes. All three statement routes need a signed-in person, and the service finds the caller's own profile first. Every statement query is filtered by that profile, so another person's statement is never matched, and the inbox list is always filtered by recipient, so a foreign statement id gives an empty list.
- Are queries safe from injection? Yes. All queries use bound values through the query builder, including the two-hour length.
- Are state-dependent writes checked inside the transaction? Yes. Starting locks the owner's profile and closes the open statement before opening the new one. Ending is a conditional update inside its own transaction. Sending checks again, inside the step that stores the drop, that a statement is still running, and locks it so it cannot end half way through.
- Is anything secret or personal logged or shown in an error? No. Statement text is never logged, and every error message is a fixed sentence.
- Are endpoints rate-limited? Yes. Starting and ending share a limit of ten per fifteen minutes per signed-in person. Reading the current statement is limited to sixty a minute. Sending drops keeps its existing sender limits, and every request still passes the general per-address limit. Over a limit the answer is 429 with the wait time.
- Passwords and lockout? Not applicable, there is no sign-in change here.
- CSRF? Start and end check that the request comes from this site, and so now do mark read and delete. One finding fixed: the earlier check skipped JSON requests, which left mark read and delete open to a cross-site request. The new check covers every non-read request regardless of content type, and tests cover a foreign origin on both drops and statements.
- Headers and caching? Every statement response is marked "do not store". The public profile already was. The public statement carries only its text and time left, with no id and no counts.

**Web app**

- Is any secret in the web app or a browser-visible setting? No. No new setting was added.
- Is any token, credential or personal data in browser storage or the address bar? No. The running statement lives in memory only. The statement filter in the address holds a statement id or the word "earlier", checked before use, and anything else is dropped.
- Is server or user content ever rendered as raw markup? No. Statement text is shown as plain text in the page and as canvas text in the story image. It is never put in a link, image source, style or preview tag.
- Is any unchecked value put into a link, image source or style? No. The statement text never goes there. The statement id in the address is checked as a UUID or "earlier" first.
- Do external links carry the safe link attributes? Not applicable, this module adds no external links.
- Does every form have a submit lock? Yes. Start and end each hold a lock, so a double click sends one request. A double click on start was tested.
- Does a failed sign-in hide which part was wrong? Not applicable, no sign-in change.
- Is debug logging removed? Yes, there is none.
- Too many requests: the existing wait message shows when a limit is hit.

Open risk carried into the PRD: statement text is public, unmoderated text, on a service open to all ages. The text check planned for drops must cover statements too.

## Verification

- Backend: format check and type check are clean. With the database switch on, 222 tests pass in 29 files. Without it, 218 pass and 4 database test files are skipped.
- Database tests cover: the two-hour length, a second start closing the first, two starts at once leaving exactly one open statement, ending early and ending twice, a statement that ran out being closed at its own end time on the next start, counts that ignore other owners, a drop landing under the running statement, a closed link refusing a drop, and the inbox statement and earlier filters.
- Web app: format check, lint (no warnings), type check, build and tests pass.
- Code size, first load in KB before and after: the public link page 137.10 to 138.11, the inbox 128.99 to 131.22, a drop's page 135.55 to 137.78, the map 131.39 to 131.97, My link 126.51 to 131.34, Settings 127.14 to 127.21. All stay under the 150 KB budget.
- Browser tests on the built app, on real development data, in light and dark: My link closed and running, starting a statement (a double click sent one request), ending with the in-page question, replacing a running statement, the countdown reaching zero and closing the link on screen, the public page open and closed, inbox sections for a live statement, an ended one and Earlier, "Only this one" and "Show all", a bad statement value in the address being dropped, the map picker with counts and Earlier, and the map's no-match message with its reset. No console errors, no content policy violations and no sideways scrolling.

## Open Items

- Only the tablet width (958 px) was checked in the browser, because the window would not resize. The phone (390), laptop (1280) and wide (1920) widths still need a manual check.
- Not tried in the browser: a send turned away as closed (sending needs a GPS fix), ending a statement that had already ended, and the public page's countdown reaching zero on its own. The first two are covered by tests.
- On the closed public page, the heading and the message say nearly the same thing. The wording can be tightened.
- The stores keep the previous account's statement until the page reloads, if someone signs out and signs in as another person in the same tab. The other in-memory stores behave the same way.
- Statement text has no content check yet. It joins the open text-check question in the PRD.
- Seen but older than this module: the logo on the public page is nearly invisible when the light theme is forced, and the map tiles stay light in dark mode.
