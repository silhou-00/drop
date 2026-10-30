# 12b App shell

**Status:** In progress
**Date:** October 31, 2026
**Traces to:** The design comps (Marbled Bath responsive layouts) and the request for the app interface

Technical detail: [frontend](../technical/frontend.md) and [design](../technical/design.md).

Run A is done: the shared frame, the restyled inbox and the restyled drop page. Run B (the real Map page, the My link and Settings pages, and the light and dark theme toggle) is still to come and will be added to this document.

## Goal

Give every signed-in page one shared frame, so the app feels like one place instead of separate pages. The frame carries the main navigation and an unread badge. Inside it, the inbox and the page for a single drop take on the look of the design comps, and on wide screens the list and the open drop sit side by side.

## What Was Built

- Signed-in pages now share one frame with four places to go: Inbox, Map, My link and Settings.
    - On a phone it is a glass tab bar at the bottom, with a small red marker that slides, gooey and springy, to the tab you tap.
    - On a tablet it is a slim rail of icons down the left side.
    - On a laptop and wider it is a wider rail with labels, and the owner's link card with a Copy button sits at its foot.
- The Inbox tab shows a count of unread drops, with "9+" above nine. It is the same number as the "N new" next to the Inbox title.
- The inbox has a title with the "N new" count, and three filter chips: All, Unread and Photos. The chosen filter is kept in the page address, so a reload or the Back button keeps it.
- Drops are grouped under Today and Earlier. Each card shows the start of the message, the place, a Photo tag when there is a photo, a short time such as "2m" or "3h", and a red dot while the drop is unread.
- Each filter has its own empty message. The empty inbox for all drops offers to share the owner's link. Load more appears when there are more drops.
- On a laptop and wider, the list sits beside the open drop. When no drop is open, the reading side says "Pick a drop to read it".
- A drop's page was restyled:
    - The message is large and easy to read.
    - The place and a GPS tag sit below it.
    - The map has zoom in, zoom out and a button that centres it back on the drop, plus an "About 150 m" label.
    - The photo sits in a ringed circle. One tap clears the blur, and a second tap shows the whole photo.
    - A button at the top marks the drop read or unread.
    - A "Share to story" pill and a round delete button sit at the bottom.
- The Map, My link and Settings pages exist as simple placeholders. My link has working Copy and Share buttons for the owner's link. Settings has Sign out.
- The word "map" can no longer be claimed as a link name, so nobody can take the address of the Map page. No existing profile used it.

## Decisions & Trade-offs

- **The list and the open drop share one stored copy of the inbox.** Marking a drop read, or deleting it, updates the list, the "N new" count and the tab badge at the same moment.
- **The drop view is rebuilt for each drop.** With the list and the drop side by side, moving from one drop to another could have carried over the last drop's revealed photo, its map position, or an open delete or share panel. Rebuilding the view each time closes that gap.
- **The filter lives in the page address.** That way Back keeps it and a filtered view can be reloaded.
- **The filter chips are toggle buttons in a labelled group.** Screen readers announce which one is chosen.
- **The later responsive comps won over the earliest ones.** Cards are plain, with no carousel.
- **The comp's "..." menu became the read toggle.** Block and report were dropped earlier, so the menu had only one useful action left.
- **"Placed by hand" became GPS.** Every drop now has a GPS place, so that is the only label.
- **No bell and no Pins chip.** Alerts arrive outside the app, and their switch will go in Settings. The badge on the Inbox tab does the bell's job inside the app.
- **Third-party looks were rebuilt, not copied.** The gooey tab bar and the glass map buttons were reference designs. They were rebuilt in the project's own code, nothing was copied, and no new packages were added.
- **The unread badge fills only after the inbox has loaded once.** This avoids an extra request just for a number.
- **Page sizes grew a little.** The public link page loads 136.72 KB (it was 134.69 KB; the growth is the larger set of app pages in the shared code), the inbox 142.13 KB and the drop page 148.52 KB. All stay under the 150 KB budget. The map code still loads only on a drop's page.

## Security Pass

**Server**

- Are inputs checked, are callers and roles checked, are queries safe, are state-dependent writes checked, are logs clean, are endpoints rate-limited? The only server change in this run is the reserved name "map". It goes through the existing link name check, which already bounds the type and length. No endpoint was added or changed, so the checks on caller, role, queries, state, logs and limits are unchanged.
- Passwords, lockout, CSRF and headers? Not applicable, nothing changed on the server.

**Web app**

- Is any secret in the web app or a browser-visible setting? No. No setting was added.
- Is any token, credential or personal data in browser storage or the address bar? No. The address holds only the filter value, and anything else in that place is ignored. Browser storage was checked empty after use.
- Is server or user content rendered as raw markup? No. Messages, places, link text and error text are all shown as plain text.
- Is any unchecked value put into a link, image source or style? The owner's link is shown as text and never used as a link target. The share address is built from a username that passed the name check. The photo address is built only from a drop id that passed the strict id check.
- Do external links carry the safe link attributes? Yes. The map credit links keep the safe attributes.
- Does every action have a lock? Yes. Load more, Copy and Share, Sign out, the read toggle and Delete are each locked against double clicks.
- Is the rate-limit message shown? Yes, the wait message appears where a request is turned away.
- Are errors handled safely? Yes. Failures show plain messages with no technical detail.
- A failed sign-in hiding which part was wrong? Not applicable, the sign-in itself did not change.
- Is debug logging removed? Yes, there is none.

## Verification

- Format check, lint, type check and the build pass. 167 tests passed and 3 were skipped.
- Browser checks at phone (390), tablet (768), laptop (1280) and wide (1920) widths, in light, dark and with each colour setting forced:
    - 64 screenshots were compared side by side with the comps.
    - No page scrolled sideways, each view had one main heading, and browser storage stayed empty.
    - The filters, the counts, switching between cards, Back, deep links and the not-found view worked.
    - Copy and Share on My link worked, and so did Sign out.
    - Keyboard order, focus rings, labelled icon buttons and 44 px tap targets were checked, and so was reduced motion.
- The test data was cleaned up afterwards.

## Open Items

- **The server's general request limit counts by network address, 60 per minute.** The browser tests hit it. Students on one campus or mobile network share an address and would share that allowance. Behind the hosting proxy this is worse until the real visitor address is read. It must be fixed before launch, in module 14.
- **The unread badge stays hidden on Map, My link and Settings until the inbox has been opened once.**
- **The drop page is 1.5 KB under the 150 KB budget.** The next change to it needs to watch its size.
- **Load more inside a filter was not tried in the browser,** because all the unread drops fit on one page.
- **The map's "townhall" icon warning from module 10 remains.**
- **Run B is still to come:** the real Map page, the My link and Settings pages, and the theme toggle.
