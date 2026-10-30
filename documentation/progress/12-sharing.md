# 12 Sharing

**Status:** Done
**Date:** October 30, 2026
**Traces to:** PRD sharing story (the story card), module 12

Technical detail: [frontend](../technical/frontend.md).

## Goal

Let the owner of a drop turn it into a tall picture made for social stories, and share or save it. The picture carries the message, optionally the photo and the place, and the owner's link, so friends who see it know where to send their own drop. It is made on the owner's phone and goes nowhere else.

## What Was Built

- On a drop's page the owner taps "Share to story" and a panel opens in the page. It shows a live preview of a tall story picture (1080 by 1920).
- Two switches choose whether the picture includes the photo and the place. The preview rebuilds when a switch changes.
- "Share" opens the phone's own share sheet when the browser can share files, and saves the picture when it cannot. "Save image" always saves it.
- A short hint tells people in the Instagram and TikTok in-app browsers to press and hold the picture to save it.
- The picture follows the approved story design: the logo, a white paper card with the message, the photo in a ringed circle, the place on a small pill with a GPS label, and a black pill with the owner's link.
- The picture is drawn in the browser. Nothing is uploaded and nothing is stored.
- The panel's code loads only when it is opened, so the drop page stays light.

## Decisions & Trade-offs

- **The background is drawn, not a picture.** The design uses a marble picture, but the one the app has is too small and would look blurry at full story size. The card draws wavy marble lines instead. Its veins are more regular than the design's.
- **The paper shadow is an approximation** of the design's soft shadow.
- **The layout adapts to what is written.** The message text shrinks to fit its card, the photo circle shrinks to make room, and a long place name or link shrinks first and is then cut with an ellipsis. A full 280-character message with emoji fits.
- **The place label always says GPS.** Every drop has a GPS place, so the label is fixed.
- **The photo switch only appears when the photo actually loaded.** If the photo fails to load, the card is made without it and the switch is hidden, rather than offering something that does nothing.
- **The card still works without the logo.** If the logo fails to load, it is drawn without it.
- **Share sits on its own row.** Three buttons (Share, Mark unread, Delete) do not fit side by side on a phone, so Share has a row above the other two.
- **The panel loads on demand.** Its code is about 5 KB compressed. The drop page's first load is 135.15 KB and the public link page's is 134.69 KB, both under the 150 KB budget.
- **A cancelled share is not an error.** If the person closes the phone's share sheet, the panel says nothing. Other failures show a plain message that points to Save image.

## Security Pass

**Server**

- Are inputs checked, are callers and roles checked, are queries safe, are state-dependent writes checked, are logs clean, are endpoints rate-limited? Not applicable. This module adds no endpoint and changes nothing on the server. The photo it reads is fetched from the existing owner-only photo route, which keeps its own checks and limits.
- Passwords, lockout, CSRF and headers? Not applicable, nothing changed on the server.

**Web app**

- Is any secret in the web app or a browser-visible setting? No.
- Is anything uploaded? No. The picture is drawn in the browser and goes only to the owner's own device.
- Is any token, credential or personal data in browser storage or the address bar? No. Storage was checked empty after use.
- Is server or user content rendered as raw markup? No. The message is drawn as plain text on the picture, and error text is shown as text.
- Are temporary image addresses cleaned up? Yes. Each preview address is released when it is replaced and when the panel closes.
- Is any unchecked value put into a link, image source or style? The link text on the card is built only from a username that passed the username check, and it is drawn as text, never used as a link target. The photo source comes from the strict drop id check.
- Do external links carry the safe link attributes? No external links were added.
- Does every action have a lock? Yes. Share and Save are locked against double clicks, and a save holds the lock for 800 ms. A double click was tested and fired once.
- Are errors handled safely? A cancelled share is not shown as an error. Other failures show a plain message with no technical detail.
- Does the page break the content policy? No violations were reported.
- A failed sign-in hiding which part was wrong? Not applicable, no sign-in change.
- Is debug logging removed? Yes, there is none.

## Verification

- Format check, lint, type check and the build pass. 161 tests passed and 3 were skipped.
- Browser checks at phone (390) and laptop (1280) widths:
    - The preview has the right size and shape, and every saved picture is exactly 1080 by 1920.
    - A 280-character message with emoji fits on the card.
    - A long place name shrinks and ends with an ellipsis.
    - Turning the photo on or off rebuilds the card and releases the old image address.
    - A drop with no place shows no place pill and no place switch.
    - Save image downloads a file named drop-story.png.
    - Share falls back to saving when the browser cannot share files, and hands the picture to the share sheet when it can.
    - Escape and the close button both return focus to the Share button.
    - A double click fires once.
    - No content policy violations were reported, and browser storage stayed empty.
- The test data was cleaned up afterwards.

## Open Items

- The photo is downloaded again for the card, even if the page already showed it.
- The background veins are more regular than the design's marble.
- The drawing has no automated test. It was checked in the browser.
