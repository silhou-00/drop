# 12 Sharing

**Status:** Done
**Date:** October 30, 2026
**Traces to:** PRD sharing story (the story card), module 12 (updated November 4, 2026)

Technical detail: [frontend](../technical/frontend.md).

## Goal

Let the owner of a drop turn it into a tall picture made for social stories, and share or save it. The picture carries the message, optionally the photo and the place, and the owner's link, so friends who see it know where to send their own drop. It is made on the owner's phone and goes nowhere else.

## What Was Built

- On a drop's page the owner taps "Share to story" and a panel opens in the page. It shows a live preview of a tall story picture (1080 by 1920).
- Two switches choose whether the picture includes the photo and the place. The preview rebuilds when a switch changes.
- "Share" opens the sticker guide described in the update below, which ends in the phone's own share sheet when the browser can share files, or saves the picture when it cannot. "Save image" always saves it.
- A short hint under the buttons says Share copies the link and shows how to add it to the story as a Link sticker.
- The picture follows the approved story design: the logo, a white paper card with the message, the photo in a ringed circle, the place on a small pill with a GPS label, and, near the foot, a spot for the link. (The spot replaced the printed link on November 4. See the update below.)
- The picture is drawn in the browser. Nothing is uploaded and nothing is stored.
- The panel's code loads only when it is opened, so the drop page stays light.

### Update: November 4, 2026, the Link sticker guide

- The story picture no longer prints the owner's link. It shows a dashed box that says "Paste your link here" with three arrows pointing up at it. The owner adds a real, tappable Link sticker from Instagram or Facebook on top of that spot, which works better than a picture of an address that nobody can tap.
- Share now copies the link in the same tap and opens a full-screen guide with five steps: copy the link, tap the sticker button, tap Link, paste the link, place it on the marked spot. The first step shows the link as text with a "Copy link" button. The other four each show a real screenshot of the Instagram story editor, with a red pulsing ring around what to tap, so the steps look like what people see. The wording is the same for every app, so people are no longer asked which app they use. Every step after the first has a "Back" button. Every step except the last has "Next step" and "Share now", so people who already know what to do can share right away.
- On the last step Share sends the image to the phone's share sheet, or saves it in browsers that cannot share files (such as in-app browsers) and says to open the app, add the image to a story, then add a Link sticker. On the screenshot steps, "Copy again" copies the link once more if the first copy was lost.
- The guide keeps keyboard focus inside itself, moves focus to its heading when it opens, closes with Escape or its close button, and hands focus back to Share.
- The same guide opens from the Share button on My link, where the picture carries the picked statement. See the statements document.
- The link people see and copy now comes from the address the site is running on, instead of a fixed name, on My link, the send page, the claim and sign-in pages and the landing page.

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

**November 4 update**

- **A marked spot replaces the printed address.** Stories only make a link tappable through the app's own Link sticker, so the picture shows where to put it instead of a link that cannot be tapped.
- **Copying comes first, in the tap.** The address goes to the clipboard before anything else, so it is ready to paste even if the share sheet is cancelled. The guide's first step and "Copy again" are backups.
- **Screenshots, not drawings.** The guide first used simple drawings because Instagram and Facebook change their screens often. The owner asked for real screenshots so the steps match what people actually see. The cost is that the screenshots go out of date when Instagram changes its screens, and Facebook users see Instagram's screens too.
- **No app choice.** The guide first had an Instagram tab and a Facebook tab that only changed the wording. They were removed because the steps are the same, and the choice added a decision for no benefit. The saved-image note names both apps. TikTok is not in the guide.
- **The guide starts with copying the link.** The link is copied when the guide opens, but people did not know it. A first step that shows the link and a copy button makes it visible and gives a way to copy again before pasting. A Back button lets people re-read an earlier step.
- **The place and photo switches stay as they were.** They only apply to a drop's picture, not to My link.

## Security Pass

**Server**

- Are inputs checked, are callers and roles checked, are queries safe, are state-dependent writes checked, are logs clean, are endpoints rate-limited? Not applicable. This module adds no endpoint and changes nothing on the server. The photo it reads is fetched from the existing owner-only photo route, which keeps its own checks and limits.
- Passwords, lockout, CSRF and headers? Not applicable, nothing changed on the server.

**Web app**

- Is any secret in the web app or a browser-visible setting? No. No setting was added in the November 4 update, or in the later screenshot change.
- Is anything uploaded? No. The picture is drawn in the browser and goes only to the owner's own device.
- Is any token, credential or personal data in browser storage or the address bar? No. Storage was checked empty after use.
- Is server or user content rendered as raw markup? No. The message is drawn as plain text on the picture, and error text is shown as text.
- Are temporary image addresses cleaned up? Yes. Each preview address is released when it is replaced and when the panel closes.
- Is any unchecked value put into a link, image source or style? The guide's screenshots are fixed files that ship with the app and carry no user content, so nothing new here. The link shown in the guide's first step and copied to the clipboard is built only from a username that passed the username check and the site's own address. It is shown as text only (the first step is a plain text panel, not a link) and never used as a link target. Re-walked on November 4 for the five-step guide: nothing new. The picture no longer carries any address. The photo source comes from the strict drop id check.
- Do external links carry the safe link attributes? No external links were added.
- Does every action have a lock? Yes. Share and Save are locked against double clicks, and a save holds the lock for 800 ms. A double click was tested and fired once. Re-walked on November 4: the guide's final Share uses the same lock, and Copy again is switched off while a copy runs.
- Are errors handled safely? A cancelled share is not shown as an error. Other failures show a plain message with no technical detail. A failed copy says to select the link and copy it, and shows no detail.
- Can the guide trap or lose a keyboard user? It was built so focus cannot leave it while it is open, Escape always closes it, and focus returns to the Share button.
- Is anything stored or sent about the link? No. The copy goes to the device clipboard only.
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

- The guide's screenshots, focus handling and the in-app browser save notice still need a manual check on real phones in Instagram and Facebook, at phone, tablet and wide widths.
- The guide has no automated test.
- The photo is downloaded again for the card, even if the page already showed it.
- The background veins are more regular than the design's marble.
- The drawing has no automated test. It was checked in the browser.
