# 10 Inbox

**Status:** Done
**Date:** October 30, 2026
**Traces to:** PRD v2.7 Epic 2 (US-2.1, US-2.2, the delete part of US-2.3), module 10

Technical detail: [backend](../technical/backend.md), [frontend](../technical/frontend.md).

## Goal

Let a person who has claimed a link read the drops sent to them. They see a list, open one to read the message, see roughly where it came from on a map, look at the photo if there is one, mark it read or unread, and delete it. Only the owner can see any of it. The server decides who may see what; the page only shows the result.

## What Was Built

- A signed-in person lands on their inbox after signing in or claiming a link. The old home address now forwards to the inbox.
- The inbox shows their link with a copy button, then their drops, newest first. Unread drops have a dot and stand out. Each card shows the place, how long ago it was sent, the start of the message, and small badges for the GPS place and for a photo.
- The list loads a page at a time. "Load more" adds the next page, and a double tap fetches it once.
- A person with no drops sees a friendly empty state that invites them to share their link. Loading and error states have a retry.
- Opening a drop shows the full message, the place name, the time, and a small map of the area. The map marks a circle of about 150 m, because that is how closely the place is known.
- Opening an unread drop marks it read. The owner can mark it unread again, or read once more.
- A photo, when there is one, stays blurred until the owner taps it. Only the owner can fetch the photo.
- The owner can delete a drop. A short in-page question asks first, and a double click sends one delete. Deleting removes the drop and its photo file for good.
- A drop that does not exist, or belongs to someone else, shows the same "This drop is not here" page.
- The map and its files load only on a drop's page, so the inbox list stays light.
- The server answers the inbox routes with the safe caching rules, and each signed-in person has their own request limit.

## Decisions & Trade-offs

- **A made-up or foreign id gets the same "not found".** The server gives one answer for a drop that does not exist, one that belongs to someone else, and an id that is not even shaped right. Nobody can probe ids to learn which ones exist.
- **Pages continue from the last drop seen, not from a page number.** If a new drop arrives while someone is reading page one, page two does not shift, so nothing is shown twice or skipped.
- **The blur is a comfort screen, not a security control.** It is the owner's own photo, so the blur only spares them a surprise in public. The real protection is that only the owner can fetch the photo at all.
- **Delete is permanent for now.** There is no undo and no trash. This changes when reporting arrives, because a reported drop has to be kept until it is reviewed.
- **Email notifications wait for the domain.** A "new drop" email needs a sending address on the real domain, which does not exist yet.
- **Opening a drop marks it read.** This matches how people expect an inbox to work. A mark unread button is there for the times they want to come back to it.
- **The map loads only on the drop page.** The map code is large, so keeping it off the inbox and the other pages keeps them fast on phones.
- **The unused pin map was folded into the drop map.** The send page no longer places a pin by hand, so the old map component had no user. Its settings and credits moved to the drop map instead of living in two places.
- **No data library was added.** The list is held in memory for the tab, so coming back from a drop shows it at once while page one reloads. The cost is that extra pages loaded with "Load more" are dropped on return.

## Security Pass

**Server**

- Is every input checked against a strict shape? Yes. The page size is a whole number from 1 to 50, the page link must be one the server made, the read flag must be true or false and nothing else, and the request body is capped at 1 KB. An unknown query field or body field is refused. A drop id that is not the right shape gets the same "not found" as any other missing drop.
- Does every protected endpoint check who is calling and whether they are allowed? Yes. Every inbox route needs a signed-in person, and the checks happen in the service as well as the route. The service finds the caller's own profile first and then looks up drops by owner and id together, so another person's drop can never match. The photo route follows the same rule.
- Are queries safe from injection? Yes. All queries use bound values through the query builder.
- Are state-dependent writes checked inside the transaction? Mark read and delete look up the drop by owner and id together, then change that one row. Delete removes the row first and then the file, and a failed file removal is logged without the file name and does not fail the delete.
- Is anything secret or personal logged or shown in an error? No. Errors give plain messages, never ids of other people's drops, file names or paths. The photo's storage key never leaves the server.
- Are endpoints rate-limited? Yes. Each signed-in person gets 120 requests a minute across the list, detail, mark read and delete routes, and 300 a minute for photos, with 429 and the wait time.
- Passwords and lockout? Not applicable, there is no sign-in change here.
- CSRF? Mark read and delete check the request origin, and the session cookie is same-site. A foreign origin gets 403.
- Headers? One finding fixed. The health and readiness checks had set a "do not store" rule for every route after them, which would have changed how other routes were cached. That rule is now limited to those two routes, and the inbox JSON sets its own. The photo is served with private, no-store caching, a no-sniff rule and an inline disposition.

**Web app**

- Is any secret in the web app or a browser-visible setting? No.
- Is any token, credential or personal data in browser storage or the address bar? No. The kept list lives in memory only and is gone when the tab closes. The page link for the next page is sent in a request, not put in the address bar.
- Is server or user content ever rendered as raw markup? No. The message, place name and error text are shown as plain text. A message containing HTML was shown as typed.
- Is any unchecked value put into a link, image source or style? The photo source is built only from a drop id that passes a strict shape check, and nothing is shown when it fails. The link text for the person's own link is shown as text and is never put in a link. Drop cards link to a route built by the router from the id.
- Do external links carry the safe link attributes? Yes. The three map credit links open in a new tab with the safe attributes.
- Does every form have a submit lock? Yes. Mark read, delete and Load more each hold a lock, so a double click sends one request. A double click on delete was tested.
- Does a failed sign-in hide which part was wrong? Not applicable, no sign-in change.
- Is debug logging removed? Yes, there is none.
- Too many requests: failures show the plain wait message from the server.

## Verification

- Backend: 159 tests pass and 3 database test files are skipped without their switch. With the switch on, 162 pass. A live check of 38 cases passed, including another account getting "not found" on a drop and on its photo, and delete removing the file from disk.
- Web app: format check, lint, type check and the build pass.
- Code size: the first load is 134.48 KB for the send page, 131.14 KB for the inbox and 133.40 KB for a drop's page, all under the 150 KB budget. The map code (318.83 KB), its styles (10.25 KB) and its worker load only on a drop's page.
- Browser tests at phone (390) and laptop (1280) widths: the list is newest first with unread dots and badges, and Load more works. Opening a drop shows the message, the place and the map, and marks it read. The photo is blurred until tapped and then served as a compact image. Mark unread works. Delete uses the in-page question, sends one request on a double click and removes the file. Another account sees "This drop is not here" and gets "not found" on the photo. The redirects from the old home address and after sign-in work. The empty state shows. The page reported no content policy violations, and message HTML was shown as text.

## Open Items

- A photo file that is missing from disk gives a server error instead of "not found".
- Pages loaded with Load more are dropped when the person returns to the inbox, which starts again from page one.
- The photo is downloaded before it is revealed. The blur hides it on screen but the file is already on the phone.
- Block and report arrive in module 11. Reported drops must be kept until reviewed, which changes how delete works.
- The new-drop email waits for the domain.
- The pause link and settings arrive in module 13.
- Every card shows the GPS place badge because every drop has a GPS location. It will carry meaning only if other sources are added.
- Carried from module 08 for before launch: the automatic check of photos and text, the move of files and database to Supabase, the real sender address behind the proxy, and the rate limit on the link preview.
