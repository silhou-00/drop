# 08 Photos

**Status:** Done
**Date:** October 30, 2026
**Traces to:** PRD v2.6 photos, module 08

Technical detail: [backend](../technical/backend.md), [frontend](../technical/frontend.md).

## Goal

Let a sender attach one photo to a drop, from the phone camera or the gallery. The server cleans and shrinks every photo before keeping it, so nothing hidden in the original file, such as the place it was taken, ever stays. The server decides every rule; the page only saves a wasted trip.

## What Was Built

- The send endpoint accepts one optional photo along with the message and location. A drop without a photo works exactly as before.
- Every photo is cleaned on the server. It is turned the right way up, stripped of all hidden data (camera details and the location it was taken), fitted inside a portrait frame, and saved in a compact format. If it is still too large, its quality is stepped down until it is small, about 400 KB at most.
- Very large pictures are refused before the server tries to open them, so a tiny file that expands into a huge image cannot use up the server's memory.
- A photo that cannot be read as a picture is refused with "That photo could not be read."
- A request that is too large is refused with a clear answer before the server reads it all.
- Photos are kept in a folder on the server's own disk, under random names, and the drop records which file belongs to it. If saving the drop fails, the file is removed again.
- The send page has an "Add a photo (optional)" step. On a phone it offers the camera or the gallery. A chosen photo shows a small preview with its size and a button to remove it. The send button says "Sending…" while a photo goes up.
- A wrong file (the wrong type, empty, or over 8 MB) shows "Use a JPEG, PNG or WebP photo up to 8 MB." and is not kept.
- The database gains a place to record each drop's photo.

## Decisions & Trade-offs

- **Photos live on our own server disk during development.** This costs nothing and needs no outside account. Before launch, the photos and the database move together to Supabase, so the hosting plan does not change twice.
- **Photos are cleaned and shrunk on the server.** A phone photo normally carries the exact spot where it was taken. Re-saving the picture drops all of that, and the sender's chosen place stays the only location Drop knows. Shrinking also keeps storage and later downloads small.
- **The browser checks only save a round trip.** The page checks type and size so a wrong file fails at once, but the server checks again from the actual bytes, because a file's stated type can be faked.
- **No special path for iPhone photo formats.** Phones turn their photos into a standard format when they are shared through a web page, so the extra work was not needed.
- **Photos are not shown to the receiver yet.** No route hands a photo back until module 10. That module will blur photos until they are tapped, and will serve them only to the person who owns the drop.
- **The page shows the photo from the phone's memory.** The preview never goes to the server until Send, and it is released when the photo is removed or the page closes.
- **A small cap on the whole request.** A photo is allowed 8 MB, and the whole send request is capped at 9 MB, so no one can ask the server to read an endless upload.

## Security Pass

**Server**

- Is every input checked against a strict shape? Yes. The message and location keep their rules. The photo must be a single file of an allowed type, from 1 byte up to 8 MB. The type is confirmed from the file's own bytes, not its name or stated type. Unknown fields are refused. The whole request is capped at 9 MB and answers 413 beyond that.
- Is the picture size bounded? Yes. Pictures over 40 megapixels are refused before they are decoded, and the cleaned result is limited to a fixed frame and a size target.
- Do protected endpoints check who is calling? The send endpoint is public by design, so there is no caller to check. The origin check from the send page still applies. No route serves photos yet, so there is nothing to protect on the way out. The owner-only check arrives with the route in module 10.
- Are queries safe from injection? Yes. The photo record is saved through the query builder with bound values.
- Are state-dependent writes checked inside the transaction? Yes. The pause check from the send flow is unchanged and still happens while saving. If the save fails, the stored photo file is removed.
- Is anything secret or personal logged or shown in an error? No. Photo files get random names unrelated to the sender, and the cleaned file carries no hidden data. Errors answer with plain messages, never file names or paths.
- Are endpoints rate-limited? Yes. The existing send limits apply to drops with photos, per address, per device and per device and recipient, with 429 and the wait time.
- Passwords and lockout? Not applicable.
- CSRF? Handled by the existing origin check on the send endpoint.
- Headers? Unchanged. The preview is shown from the phone's own memory, which the existing content policy already allows. Nothing new was added to it.
- Are uploaded files kept out of the code and the repository? Yes. The photo folder sits outside the committed code and is excluded from version control.

**Web app**

- Is any secret in the web app or a browser-visible setting? No. The photo folder location is a server setting only.
- Is any token, credential or personal data in browser storage or the address bar? No. The chosen photo lives in memory only and is gone when the page is left.
- Is server or user content ever rendered as raw markup? No. The photo error and size are shown as plain text.
- Is any unchecked value put into a link, image source or style? The preview address is made by the browser from the chosen file and is a local blob address, never text from the server or the user. It is released when no longer needed.
- Do external links carry the safe link attributes? Not applicable, no external link was added.
- Does every form have a submit lock? Yes. The send lock from module 07 covers the photo too. A double click with a photo attached sent once.
- Does a failed sign-in hide which part was wrong? Not applicable, there is no sign-in here.
- Is debug logging removed? Yes, there is none.
- Too many requests: unchanged, the page shows the wait time from the server.

## Verification

- Format check, lint, type check and the build pass.
- 128 tests pass and 2 are skipped. The skipped ones are the database tests, which also pass when switched on.
- The send page's code size is about 133.6 KB against the 150 KB budget.
- Browser tests at phone (390) and laptop (1280) widths: attaching a photo, seeing the preview, and removing it; sending with a photo, after which the stored file was a 1080 by 720 compact image with no hidden data and the drop recorded its photo; a 9 MB file was blocked on the page with no request sent; a fake picture was refused by the server with "That photo could not be read."; a double click sent once; and the page reported no content policy violations.

## Open Items

- Add the owner-only photo route and the blur until tapped in module 10. Until then, stored photos cannot be viewed.
- Add an automatic check of photos and text before launch.
- Move the photo files and the database to Supabase before deploy.
- Memory use under many large uploads at once has not been measured. Each photo is held in memory while it is cleaned.
- If removing a photo file fails after a failed save, that second failure could hide the original error.
- The PRD wording for the avatar still names the older storage service and needs correcting.
- The small line under Send does not mention the photo yet.
