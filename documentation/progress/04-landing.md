# 04 Landing

**Status:** Done
**Date:** October 29, 2026
**Traces to:** Request to build the approved landing page (concept A, "The Bath") with smooth scrolling and scrollbar option A, "Hairline"

Technical detail: [frontend](../technical/frontend.md) and [design](../technical/design.md).

## Goal

Give Drop its front page: the first thing a visitor sees, usually inside a social app's built-in browser on a phone. It should explain what Drop is in seven short steps as the visitor scrolls, and end at the place where they claim their link. It should look and move the way the approved design does.

## What Was Built

- A landing page that tells Drop's story in seven steps as the visitor scrolls: a drop falls into the marbled bath, a map of a real place appears, a note lifts off it, someone finds the note, it becomes a story card on a phone, the safety promises are listed, and the visitor is invited to claim their link.
- One marbled background behind the whole page that changes with the story: it spreads ink when the drop lands, turns into a street map, zooms and pans, and goes dark for the dark steps. There is only one live drawing surface on the page, so it stays light on phones.
- Smooth scrolling for mouse wheels and touchpads. Touch scrolling on phones stays the phone's own, because smoothing a swipe feels slow inside in-app browsers. Keyboard scrolling and in-page links still work, and the steps that hold in place while you scroll still hold.
- A thin scrollbar that matches the design, shown only to visitors with a mouse. It follows the page exactly, can be dragged or clicked, fades away when idle, and turns light over dark parts of the page. Phones keep their own scrollbar. A matching thin style is ready for lists that scroll inside the app later.
- A top bar with sign in and "Claim your link" that turns light over dark steps and solid near the end.
- A small step counter in the corner showing which of the seven steps the visitor is on.
- A claim step that opens with a circle growing out of the logo. It checks the name the visitor types with the same rules the system uses for usernames. Because sign-up is not built yet, a valid name gets the message "Sign up opens soon. Your name is not saved yet." instead of pretending an account was made. The page behind it stops scrolling while it is open.
- A footer with a short summary, common questions that open and close, and links.
- A calm version for visitors who ask for less motion: no smooth scrolling, no live background, a still picture of the bath, and every step shown in its finished state.
- A fallback for devices that cannot draw the live background: the still pictures show instead, and the page works the same.

## Decisions & Trade-offs

- **The approved design was copied closely.** The page was checked side by side with the design at phone, tablet, laptop and wide-screen sizes, and matches it. The long "safety promises" step keeps its full length.
- **The empty space before the footer was trimmed.** The claim step is a little shorter than in the design, so the visitor reaches the footer without scrolling through blank paper. The claim and footer pictures therefore sit slightly higher than in the design.
- **The landing is always shown in light mode.** The design was only made for the light palette, so the page sets light mode while it is open and puts the visitor's setting back when they leave.
- **The background was extended, not duplicated.** The marbled background from module 03 gained what the landing needs (street lines, a moving camera, ripples and a cut-out area), so the app keeps one version of it. The dark street colour was not in the design and was picked to sit quietly on the dark ground.
- **The page uses the design's own size steps.** Its layout changes at the same screen sizes as the design, which differ slightly from the steps used in the rest of the app.
- **One timer drives everything.** The smooth scrolling, the background, the text, the top bar, the step counter and the scrollbar all read the same scroll position on every frame, so they never drift apart.
- **The claim message is our own wording.** The PRD sets the username rules but no error message, so a plain one was written: "Use 3 to 30 letters, numbers, dots or underscores."
- **Each piece sits in its own box.** A few extra wrappers were added (the call-to-action row, the top bar row, the footer brand) so every part can be checked on its own when testing sizes, as the layout rules ask.
- **The page was tuned to run as smoothly as the design.** The first measurement on a slowed phone was taken on the development version, which is much heavier than what visitors get. Measured again on the real release build, it was still slower than the design: the background asked the browser for its size on every frame, which made the browser redo its page layout each time, and the scrollbar reset a timer on every frame. Both were fixed. Now, on a phone-sized screen with the processor slowed to a quarter of its speed, a frame takes about 17 milliseconds on average (about 60 frames a second), slightly better than the design itself measured the same way.

## Security Pass

**Server**

- Are all inputs checked against a strict shape? Not applicable. This module adds no server code.
- Do protected endpoints check who is calling? Not applicable, no endpoints were added.
- Are database queries safe from injection? Not applicable, there is no database access.
- Are state-dependent writes checked inside a transaction? Not applicable, nothing is written.
- Is anything secret or personal logged or shown in an error? No. The module logs nothing.
- Are endpoints rate-limited? Not applicable, no endpoints were added. The claim form sends nothing to the server yet.

**Web app**

- Is any secret in the web app's code? No. The module uses no keys or settings, and the release build was searched for secret-like text with no matches.
- Is any token or personal data kept in browser storage or a web address? No. Nothing is stored, and the name typed into the claim form stays on the page.
- Is server or user content shown as raw HTML? No. All text, including the claim message, is shown as plain text. Nothing from the web address is shown on the page.
- Are unchecked values placed in links, image sources, or styles? No. Every link and picture address is fixed in the code, and the values placed in styles come from the project's own settings.
- Do outside links carry the safe-link attributes? There are no outside links. Every link on the page moves to another part of the same page.
- Do forms block double submits? Yes. The claim form ignores a second press while the first is still being handled.
- Does a failed sign-in hide which field was wrong? Not applicable, there is no sign-in here. The claim form never pretends to succeed.
- Was debug logging removed? Yes. No logging was added.
- Does anything meant only for development reach the release version? No. The release build was searched for the tuning panel library and none was found.

## Verification

- Installed, linted, type checked, built and format checked the project. All passed, with no linter warnings. A warning about how the smooth-scrolling helper started up was fixed by changing how the page receives it, without switching the rule off.
- Searched the release build for the tuning panel library and for secret-like text. Nothing was found. Checked that the new smooth-scrolling package is used.
- Measured the landing's own download: about 76 kilobytes, 23 kilobytes compressed, plus the shared background code.
- Opened the page in a real browser at phone, tablet, laptop and wide-screen sizes. There were no errors and no sideways scrolling at any size. Compared pictures of every step with the approved design at all four sizes.
- Checked the calm version and the no-graphics fallback at phone and laptop sizes: no errors, still background, all text visible.
- Scrolled through the two longest steps frame by frame at every size, with and without motion, looking for empty frames or headings on top of each other. None were found.
- Checked smooth scrolling: the wheel glides, keyboard keys reach the top, a page down and the end, the holding steps hold, the page stops while the claim step is open and starts again when it closes, and focus returns to the button that opened it. A phone swipe is not smoothed.
- Measured smoothness on the release build, served only to this computer, at phone size with a high-density screen, at normal speed and with the processor slowed to a quarter, next to the design measured the same way in the same session. Slowed, the page went from about 27 milliseconds per frame, with one frame in five running late, to about 17 milliseconds with almost none late. The design measured about 18.5 milliseconds. The live background stayed on throughout. Exact numbers are in the technical reference.
- Checked the scrollbar: it lines up with the page to the pixel, dragging and clicking the track move the page to the right place, it hides after a pause, it is hidden from screen readers and the keyboard, and it does not appear on touch screens.

## Open Items

- The claim form does not create anything yet. It connects when the sign-up module is built.
- Smoothness was measured in a desktop browser slowed down to imitate a phone. A check on a real low-end phone is still worth doing.
- The footer's privacy, terms and safety links lead back to the top of the page until those pages exist.
