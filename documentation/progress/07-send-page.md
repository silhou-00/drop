# 07 Send Page

**Status:** Done
**Date:** October 30, 2026
**Traces to:** PRD v2.3 sender flow (US-1.x), and the decisions on place names, map hosting and the deferred text check

Technical detail: [backend](../technical/backend.md), [frontend](../technical/frontend.md), [design](../technical/design.md).

## Goal

Let anyone open a person's link and send them an anonymous drop: a short message, with an optional place. The sender needs no account and gives no name. The server decides every rule; the page only makes the rules easy to follow.

## What Was Built

- A public send endpoint for each link. It takes a message of up to 280 characters and, if the sender wants, a place.
- A place can come from the sender's phone location or from a pin they place by hand on a map. Either way the place is rounded to about 150 m before it is saved, so the exact spot is never stored.
- Each saved place gets a readable name (a neighbourhood and city, never a street or house number) from a lookup service. Names are remembered so the same area is not looked up again.
- Limits on sending: per visitor address, per device, and per device and recipient together. Over the limit, the sender is told how long to wait.
- A paused link refuses new drops with a clear message. The check happens at the moment of saving, so a pause that lands mid-send still wins.
- A device label cookie, set when a profile page is first read, so one device can be counted without knowing who it is.
- Map files served by the app itself, with their own limit, so the map needs no outside host.
- Link previews: when a link is shared in a chat app, it shows a card with the person's name.
- The send page at the person's link: avatar or initial, the link name, a message box with a live character count, the two place buttons, a place summary that can be removed, and a send button.
- A pin sheet that rises from the bottom on phones and opens as a dialog on wider screens. The map sits under a fixed centre pin; the sender moves the map, not the pin. Credits to the map sources sit in the corner.
- A sent screen that says the drop went, offers to send another, and invites the sender to claim their own link.
- Friendly pages for a link that does not exist, a link that failed to load, and a link that is paused.
- Names typed with capitals are sent on to the lowercase form.
- The page works from phone width up to wide screens and respects reduced motion.

## Decisions & Trade-offs

- **No automatic text check for now.** The PRD left this as an open question, and no free option was found. Drops are saved without a check, and a slot is left in the send flow for one to be added before launch.
- **The map file is served by our own server.** A storage service would have needed a payment card on file. Serving the file ourselves costs nothing extra, but the host must have disk space for it at deploy.
- **Place names come from a lookup service.** Its free plan allows names to be kept for 48 hours, so they are kept for exactly that long, and the service is credited with a visible link next to the map as the plan requires. If the lookup fails, the drop is still saved, just without a name.
- **Locations are rounded to about 150 m.** This keeps a drop useful as a clue without pointing at a doorway. Only the centre of the area is saved.
- **The map loads only when a sender taps "Place a pin".** Most senders never open it, so the page stays small: about 133 KB of code against a 150 KB budget. The map and its helper load later, on demand.
- **Senders are counted by scrambled labels.** The sender address and the device label are each turned into a one-way code with a server secret before being stored or counted. Raw addresses are never saved or logged. The cost: if the secret is ever changed, old codes no longer match new ones.
- **Links shared in chat apps show a preview card.** The server fills the page's title and preview tags for a live profile, so the card names the person. The text is escaped before it is placed in the page.
- **The send endpoint only accepts posts from Drop itself.** Because senders have no session, the usual cookie protection does not apply, so the server checks where the post came from instead.
- **A visitor who clears cookies resets their device count.** This is accepted. The address limit still applies.
- **Map style follows the Drop palette.** The map reads as a calm grey plate, with the red pin as the only colour.

## Security Pass

**Server**

- Is every input checked against a strict shape? Yes. The body is a form with a message (1 to 280 characters) and optional latitude, longitude and source, all with type and range checks. Unknown or malformed input gets a 422. The whole body is capped at 16 KB.
- Do protected endpoints check who is calling? The send endpoint is public by design, so there is no caller to check. Instead, it checks that the post comes from Drop's own site; others get a 403. The recipient is found by link name only, and a missing or reserved name answers 404.
- Are queries safe from injection? Yes, all queries go through the query builder with bound values, including the place cache and the saved location.
- Are state-dependent writes checked inside the transaction? Yes. The pause setting is re-read inside the saving transaction while the profile row is held, so a pause cannot slip past a send.
- Is anything secret or personal logged or shown in an error? No. Addresses are not logged. Only scrambled labels are held. The lookup service key travels in a web address that is never logged. Errors answer with plain messages.
- Are endpoints rate-limited? Yes. The send is limited per address, per device and per device and recipient. The map files have their own limit of 600 per minute per address. All other API paths keep the general limit. Over any limit gives 429 with the wait time.
- Passwords and lockout? Not applicable, there is no sign-in on this page.
- CSRF? Handled by the origin check described above.
- Headers? Every response carries the security headers. No new outside site was added to the content policy, because the map files, fonts and icons all come from Drop itself.
- Preview tags: the person's name is escaped before it goes into the shared-link card.

**Web app**

- Is any secret in the web app or a browser-visible setting? No. The lookup key and the scrambling secret stay on the server.
- Is any token, credential or personal data in browser storage or the address bar? No. The message and the chosen place live in memory only and are gone on leaving the page. Nothing goes in the address bar.
- Is server or user content ever rendered as raw markup? No. Names, messages and errors are shown as plain text.
- Is any unchecked value put into a link, image source or style? Avatar links are checked first: only https links or links on the same site are shown, anything else falls back to the initial. This rejects script and data addresses.
- Do external links carry the safe link attributes? Yes. The three map credit links open in a new tab with the no-opener, no-referrer attributes.
- Does every form have a submit lock? Yes. A lock inside the send logic means a double click sends once. The button also shows "Sending" and is disabled.
- Does a failed sign-in hide which part was wrong? Not applicable, there is no sign-in here.
- Is debug logging removed? Yes, there is none.
- Too many requests: the page shows "Too many tries. Try again in N seconds." from the server's wait time.

## Verification

- Backend: 103 tests pass, plus 2 database tests run on request. A live send against the running server was checked.
- Web app: browser tests at phone (390), tablet (768), laptop (1280) and full HD (1920) widths covered the phone location flow, the pin map, sending, the double-click lock, a link that is paused, a rate limit, a conflict answer, a link that does not exist, and unsafe avatar links. No content-policy violations were reported.
- Lint, type check, format check and the build pass.
- The page's code size was measured against the budget (see Decisions).

## Open Items

- Behind the hosting proxy, read the real visitor address before deploy. Until then, every visitor may be counted as the proxy.
- Add a text check before launch.
- Rate-limit the lookups made by the shared-link preview page.
- A visitor who clears cookies resets the device limit. The address limit still applies.
- When avatars move to outside storage, its address must be allowed in the image rule of the security header.
- The host needs disk space for the map file at deploy.
