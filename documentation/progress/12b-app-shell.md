# 12b App shell

**Status:** Done
**Date:** October 31, 2026
**Traces to:** The design comps (Marbled Bath responsive layouts) and the request for the app interface

Technical detail: [frontend](../technical/frontend.md) and [design](../technical/design.md).

Run A built the shared frame, the restyled inbox and the restyled drop page. Run B added the real Map page, the My link and Settings pages, the light and dark choice, and a round of speed work.

## Goal

Give every signed-in page one shared frame, so the app feels like one place instead of separate pages. The frame carries the main navigation and an unread badge. Inside it, the inbox and the page for a single drop take on the look of the design comps, and on wide screens the list and the open drop sit side by side. The Map, My link and Settings tabs lead to real pages, the owner can pick a light or dark look, and moving around the app feels quick.

## What Was Built

- Signed-in pages now share one frame with four places to go: Inbox, Map, My link and Settings.
    - On a phone it is a glass tab bar at the bottom, with a small red marker that slides, gooey and springy, to the tab you tap.
    - On a tablet it is the same bottom tab bar as on a phone, with the page centred above it.
    - On a laptop and wider (1280 and up) it is a rail down the left side with labels, and the owner's link card with a Copy button sits at its foot.
- The Inbox tab shows a count of unread drops, with "9+" above nine. It is the same number as the "N new" next to the Inbox title. The count also fills in when the app is opened on My link or Settings.
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
- The word "map" can no longer be claimed as a link name, so nobody can take the address of the Map page. No existing profile used it.
- The Map page shows every drop the owner has received as a red pin at the place it was sent from. Each pin carries the number of drops there.
    - Pins close together merge into one. Choosing a merged pin zooms in until it splits.
    - Choosing a single pin glides the map to that place, draws the soft area around it, and shows that place's drops in a list. On phones and tablets the list rises over the map. From laptops it is docked beside the navigation, shows every matching drop until a place is chosen, and can be folded away.
    - The same three filters as the inbox sit on the map. They work on the drops already loaded, so they need no network.
    - Opening a drop from the map carries only the filter, so going Back brings back the chosen place.
    - A button fits all pins into view. It never asks for the owner's own position.
    - With no drops yet, the page invites the owner to share the link instead. If nothing matches a filter, a short note says so.
- The My link page shows the owner's link in large text, with Copy and Share and a tilted preview of the story image. Copy copies the link. Share sends the story image to the phone's share sheet, and falls back to sharing the plain link if the image could not be made. The story line reads "Saw me somewhere? Send me an anonymous drop."
- The Settings page has an Appearance choice (Light, Dark or Auto), a note that places are rounded to about 150 m, and Sign out.
- The look can now be light, dark or follow the device. The choice is remembered on the device and applied before the first paint, so there is no flash of the wrong look. A new choice spreads out like a circle from the button that was picked, and simply changes at once for people who prefer less motion. A change made in one tab shows in the other tabs too. The landing page stays light.
- Moving between pages is quicker. A page's code starts loading when a link is hovered, touched or focused, and the sign-in check made on each move is reused for 30 seconds.
- The photo viewer loads only for drops that have a photo, and the marbled background loads after the page and fades in.

## Decisions & Trade-offs

- **Tablets use the bottom bar, not a wider rail (changed November 1, 2026).** The first tablet design put a slim icon rail on the left. In use, the rail pulled the page content off-centre, so the reading column looked pushed to the right. Tablets now keep the same bottom tab bar as phones, and the content sits centred above it. The side rail appears only from 1280 pixels, where there is room for it beside the list and reading panes.
- **The list and the open drop share one stored copy of the inbox.** Marking a drop read, or deleting it, updates the list, the "N new" count and the tab badge at the same moment. The map hears the same changes and updates its pins.
- **The drop view is rebuilt for each drop.** With the list and the drop side by side, moving from one drop to another could have carried over the last drop's revealed photo, its map position, or an open delete or share panel. Rebuilding the view each time closes that gap.
- **The filter lives in the page address.** That way Back keeps it and a filtered view can be reloaded. On the map the chosen place lives there too.
- **The filter chips are toggle buttons in a labelled group.** Screen readers announce which one is chosen.
- **The later responsive comps won over the earliest ones.** Cards are plain, with no carousel.
- **The comp's "..." menu became the read toggle.** Block and report were dropped earlier, so the menu had only one useful action left.
- **"Placed by hand" became GPS.** Every drop now has a GPS place, so that is the only label.
- **No bell and no Pins chip.** Alerts arrive outside the app, and their switch will go in Settings. The badge on the Inbox tab does the bell's job inside the app.
- **Third-party looks were rebuilt, not copied.** The gooey tab bar and the glass map buttons were reference designs. They were rebuilt in the project's own code, nothing was copied, and no new packages were added.
- **The unread badge first waited for the inbox, then got its own small request.** In run A it filled only after the inbox had loaded. Run B asks the server for one tiny page when the app opens on a page that loads no drops, and keeps only the unread number. The inbox and the map bring the number with their own loads and send no extra request.
- **Page sizes were pulled back under the budget.** After run A the drop page was only just under the 150 KB limit. Run B moved the photo viewer, the story image drawing and the marbled background out of the first load. Every page now loads between about 126 and 137 KB, and the drop page fell from 148.5 to 135.6 KB. The map engine is in no page's first load; it loads once drops have arrived.
- **The map loads in steps.** Up to 200 drops load on their own (four pages of 50). A "Load older drops" button adds more, up to 500. A load from the last minute is reused when coming back to the map. The filters work on the device, so switching them never waits.
- **The map can pan a little past the Philippines.** The map data covers only the Philippines, but a wide screen with a docked list needs room to keep far-apart pins clear of the list, the chips, the controls, the navigation and the credits.
- **The map stays light in dark mode,** as the single-drop map already did, so the red pins read the same everywhere. The map page has no marbled background, because the map fills the screen.
- **The locate button fits all pins and never asks for the owner's position.** Drops are about where other people were, not where the owner is.
- **My link and Settings are two pages,** where the comp shows one. They hold different jobs, and each fits one screen better on its own.
- **Settings was trimmed to what exists today.** Alerts, pause link, blocked senders and delete account are left out, because their features are not built yet. The pause link comes with module 13.
- **The theme choice is kept only on the device.** It is the one thing the app stores in the browser, and it is checked every time it is read. Auto removes the stored value so the device decides.
- **The sign-in check is reused for 30 seconds.** The server still checks every request. If access is revoked elsewhere, a page frame may show for up to 30 seconds, then its data requests fail and the next move sends the user to sign in. The reused check is kept in memory only and is forgotten on sign-out and on any "not signed in" answer from the server.
- **The pin badge always shows the drop count,** even for one drop, so every pin reads the same way.
- **The inbox header's moon button from the comps was left out.** The page size budget was tight at the time, and Settings covers the theme choice.
- **Segmented choices are 44 px tall,** not the comp's smaller size, so they are easy to tap.

## Security Pass

Run A and run B are walked together.

**Server**

- Are inputs checked, are callers and roles checked, are queries safe, are state-dependent writes checked, are logs clean, are endpoints rate-limited? The only server change in the whole module is the reserved name "map", added in run A. It goes through the existing link name check, which already bounds the type and length. Run B changed nothing on the server: it uses the existing inbox list with a page size, which the server already bounds. The checks on caller, role, queries, state, logs and limits are unchanged.
- Passwords, lockout, CSRF and headers? Not applicable, nothing changed on the server.

**Web app**

- Is any secret in the web app or a browser-visible setting? No. Run B added no setting, secret, package or server change.
- Is any token, credential or personal data in browser storage or the address bar? No. The only thing stored in the browser is the theme choice, and it is checked against the allowed values on every read; anything else is removed. The address holds the filter and the chosen map place, both checked against strict patterns, and anything else is dropped. The reused sign-in check is kept in memory only.
- Is server or user content rendered as raw markup? No. Messages, places, link text, pin labels and error text are all shown as plain text.
- Is any unchecked value put into a link, image source or style? The owner's link is shown as text and never used as a link target. The share address is built from a username that passed the name check. The photo address is built only from a drop id that passed the strict id check. The My link preview is an image made in the browser itself. The map credit links are fixed.
- Do external links carry the safe link attributes? Yes. The map credit links, now shared by both maps, keep the safe attributes.
- Does every action have a lock? Yes. Load more, Load older drops, Copy, Share, Sign out, the read toggle and Delete are each locked against double clicks.
- Is the rate-limit message shown? Yes, the wait message appears where a request is turned away, and the map never retries on its own.
- Does the page security policy still hold? Yes. The theme starts from a file served by the app itself, not from inline script, and the browser reported no policy violations on the built server.
- Are errors handled safely? Yes. Failures show plain messages with no technical detail.
- A failed sign-in hiding which part was wrong? Not applicable, the sign-in itself did not change.
- Is debug logging removed? Yes, there is none.

## Verification

- Format check, lint, type check and the build pass. 167 tests passed and 3 were skipped.
- The browser reported no policy violations on the built server.
- Browser checks at phone (390), tablet (768), laptop (1280) and wide (1920) widths, in light, dark and with each colour setting forced:
    - 64 screenshots were compared side by side with the comps.
    - No page scrolled sideways, and each view had one main heading.
    - The filters, the counts, switching between cards, Back, deep links and the not-found view worked.
    - Keyboard order, focus rings, labelled icon buttons and 44 px tap targets were checked, and so was reduced motion.
- Theme: the choice is remembered, there is no flash on load, the circle change works and gives way to an instant change under reduced motion, the landing page stays light, blocked browser storage still works, and a change in one tab shows in another.
- Map:
    - Pins merge and split, the panel opens, and the filters work with the network off.
    - The locate button fits every pin at all widths, and cards carry only the filter into a drop.
    - Back restores the chosen place, and marking read or deleting updates the pins and the badge.
    - A load from the last minute is reused, an account with no drops loads no map engine, and the no-match note shows.
    - A "too many requests" answer shows the wait message with no automatic retry, and the collapse button works.
    - Pins work from the keyboard with Enter and Space, focus moves to the panel heading at phone, tablet and laptop widths, and Escape and Close return focus.
- The unread badge on a cold Settings load used one small request, and on the inbox none.
- My link: the preview, sharing the image, the download fallback and Copy all worked, and double clicks were locked.
- The photo viewer's placeholder causes no layout shift, and hovering a link to preload a page sends no sign-in checks.
- Test data was created for these checks and removed afterwards.

## Open Items

- **The server's general request limit counts by network address, 60 per minute.** The browser tests hit it. Students on one campus or mobile network share an address and would share that allowance. Behind the hosting proxy this is worse until the real visitor address is read. It must be fixed before launch, in module 14.
- **Load more inside an inbox filter was not tried in the browser,** because all the unread drops fit on one page.
- **The map's "townhall" icon warning from module 10 remains.**
- **Map credit links are small text inside the map.** They are exempt from the tap size rule because they sit inline in the credits line.
- **Drops outside the Philippines have no pin,** because the map data covers only the Philippines.
- **Zoomed far out on a wide screen, the map shows plain ground** past the edge of the map data.
- **Sign-out could not be tested from end to end on a test address** that is not the configured one. It works on the configured address.
- **Pause link is module 13.** Its switch will go in Settings then.
- **The path where the app forgets a reused sign-in check after a "not signed in" answer was not exercised in a browser.**
