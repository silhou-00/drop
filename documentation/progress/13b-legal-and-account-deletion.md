# 13b Legal pages and account deletion

**Status:** Done
**Date:** October 31, 2026
**Traces to:** PRD v3.1 Epic 2 (US-2.7), section 7.7 (Legal), Open Questions 10 to 12, module 13b

Technical detail: [backend](../technical/backend.md), [frontend](../technical/frontend.md), [design](../technical/design.md).

## Goal

Give Drop the two things a public service owes its people before launch. First, plain pages that say what Drop is, what is not allowed, what it keeps and how to get help: Terms, Privacy and Safety. Second, a way for a person to delete their account and everything tied to it, from Settings, with no email to the team needed.

Drop is open to all ages, so the pages are written in short, plain words and say so. They also say plainly what Drop cannot do: there is no report or block button, and nobody at Drop reads drops.

## What Was Built

- Three public pages at `/terms`, `/privacy` and `/safety`. Each opens at the top, follows the person's light or dark choice, loads fast, and shows a "Last updated" date.
- **Terms.** What Drop is, that it is open to everyone, a short list of what is not allowed (anything illegal, and a respect for other people's privacy), what Drop can do about accounts that break the rules, and a contact address.
- **Privacy.** What Drop keeps when someone has an account, what it keeps about drops sent to them, how senders are counted without being identified, which cookies and browser storage Drop uses, who helps run it, how long things are kept, how to delete everything, the person's rights under the Data Privacy Act, and a note for children and teens. It says honestly that a sign-in keeps the device's network address and browser name for up to 7 days, and that drops a deleted person sent to others stay with the people who got them.
- **Safety.** What a person can do if a drop upsets them (delete it, end their statement, talk to someone they trust), what to avoid sharing, who to call in an emergency (911) and the free crisis line (1553), and what to do on receiving sexual images of a child.
- The contact address on these pages comes from a setting that is checked when the web app is built. A build with no valid address stops, so the pages can never go out with a missing or broken one.
- Each legal page has a Back button at the top. It returns to where the person came from inside the app, or goes home when the page was opened directly. The links in the footer are now pills, and the page the person is on is filled in.
- The footer on the landing page now opens the three pages. The answer to "What if a note is mean?" no longer promises a block or report button, which Drop does not have. It points to deleting the drop and to the Safety page.
- Settings gains a **Delete account** row in the warning colour. It opens a panel that lists what will go: the link stops working at once, every drop sent to the person is deleted with its photos and places, statements are deleted, all devices are signed out, and the link name stays locked for 30 days. It asks the person to type their link name. The button stays off until the name matches, Cancel is selected first so a stray Enter does nothing, and a double click sends one request.
- On success the person is signed out everywhere and lands on the home page. Their link no longer works, and any page that needs a sign-in sends them to sign in.
- A deleted link name is held for 30 days. During that time nobody else can claim it, and the claim page answers "That name is taken." like any other taken name.
- Settings also has an "About Drop" card with links to the three pages.
- Photo files of the deleted drops are removed from the server's storage.

## Decisions & Trade-offs

- **Deleting is one all-or-nothing step.** The account, profile, statements, drops and sign-in records are removed together. The person's own profile is locked first, so a drop being sent at the same moment either lands before the deletion (and is removed with it) or is turned away.
- **Drops a person sent to others are not removed.** Senders have no account, and Drop keeps nothing that links a drop to a person. So deleting an account cannot find the drops that person sent. The Privacy page says so.
- **The link name is held for 30 days.** Otherwise someone could claim the name and receive drops meant for the old owner through links left in bios. The cost: the live "is this name free" check on the claim page still shows a held name as free until the person submits. It is recorded as an open item.
- **A photo file that cannot be removed does not undo the deletion.** After the account is gone nothing points to that file and nothing can serve it. Only the number of failures is logged, never a name or file. A sweep for leftover files is an open item.
- **The person confirms by typing their link name.** It is checked on the screen and again on the server. A fresh sign-in as an extra step is left as an open item.
- **A signed-in person who never claimed a link gets "not found".** Such an account holds only an email address. It can be removed on request through the contact address.
- **The server never says why a body was refused.** Every bad request to delete answers with the same sentence, "Type your link name to confirm.", so no internal message can leak.
- **After deleting, the page does a full reload.** That clears everything the app kept in memory, so no trace of the old account remains on the screen.
- **The legal pages follow the person's theme.** The landing page stays light, but these pages are reading pages and should match the device.
- **Only two phone numbers are listed.** 911 and 1553 are shown. Other numbers wait until they have been checked.
- **The text is a draft.** It is written to match what the system does today, and it needs a lawyer's review before launch.
- **The earlier same-site check fix is reused.** The strict check from module 13a also guards the delete request.

## Security Pass

**Server**

- Is every input checked against a strict shape? Yes. The delete request must be JSON with exactly one field, the link name, trimmed and 1 to 30 characters, and it is capped at 1 KB. There are no path, query or header inputs. Any problem, including a wrong name, gets the same fixed sentence, so a schema message never reaches the client.
- Does every protected endpoint check who is calling and whether they are allowed? Yes. The request needs a signed-in person, and the service deletes only that person's own rows. The link name is checked again on the server inside the deletion, so a forced request cannot skip the screen.
- Are queries safe from injection? Yes. All queries use bound values through the query builder, including the 30 day hold.
- Are state-dependent writes checked inside the transaction? Yes. The profile is locked, the name is compared and the photo list is read inside the same step that removes the rows. Claiming a name checks the hold inside its own step, after clearing expired holds.
- Is anything secret or personal logged or shown in an error? No. The only log line is a count of photo files that could not be removed. Errors use fixed sentences.
- Are endpoints rate-limited? Yes. The general limit per address applies, plus 5 deletes per minute per signed-in person. Over the limit the answer is 429 with the wait time.
- Passwords and lockout? Not applicable, sign-in is by email code and this module does not change it.
- CSRF? Yes. The delete request must come from this site, whatever its content type, using the strict check added in module 13a. A foreign origin gets 403, and tests cover it.
- Headers and caching? Every reply to the delete request is marked "do not store", errors included. The session cookies are cleared in the reply, and all other devices are signed out because their sign-in records are removed with the account.
- Dependencies and secrets? No package was added. No secret was added or logged. The new build setting is public by design.

One thing the pass surfaced and the Privacy page now says: sign-in records keep the device's network address and browser name for up to 7 days. The PRD line that raw addresses are never stored is true only for senders. Whether to stop keeping them is a later decision.

**Web app**

- Is any secret in the web app or a browser-visible setting? No. The contact address is public by design and must be a role address, not a personal one.
- Is any token, credential or personal data in browser storage or the address bar? No. The delete flow keeps nothing in storage, and the link name is typed into the panel only.
- Is server or user content ever rendered as raw markup? No. The pages are fixed text, and an error from the server shows as plain text.
- Is any unchecked value put into a link, image source or style? No. Phone links are fixed numbers, and the mail link is built from the address checked at build time.
- Do external links carry the safe link attributes? Yes. The one external link, to the National Privacy Commission, carries them.
- Does every form have a submit lock? Yes. The delete holds a lock, so a double click sends one request, and the lock stays shut after success. A double click was tested.
- Does a failed sign-in hide which part was wrong? Not applicable, no sign-in change.
- Is debug logging removed? Yes, there is none.
- Too many requests: the existing wait message shows when the limit is hit, and was tested.

## Verification

- Backend: format check, lint and type check pass. Tests: 229 pass and 5 are skipped (the ones that need the database). With the database switch on, 234 pass in 32 files.
- Database tests cover: a wrong name deleting nothing; the right name leaving no rows for the user, session, sign-in account, profile, drops or statements; the photo file being removed; a hold about 30 days out; a held name refused at claim; an expired hold allowing the claim and being cleared; and a drop sent at the same moment as the deletion leaving no drop behind.
- Web app: format check, lint, type check, build and tests pass.
- Code size, first load in KB (gzipped) before and after: home 140.34 to 140.41, the public link page 138.11 to 138.16, the inbox 131.22 to 131.25, a drop's page 137.78 to 138.12, the map 131.97 to 132.32, My link 131.34 to 131.37, Settings 127.21 to 132.26. The new pages: Terms 111.91, Privacy 112.52, Safety 111.68. All stay under the 150 KB budget.
- Browser tests on the built app, at about 1264 px wide, in light and dark: each legal page has one main heading, the right tab title, working phone and mail links and no sideways scroll; the footer and Settings links open each page; the delete panel shows the message for a wrong name; one real deletion (a double click sent exactly one request, the person landed on the home page, the profile was gone, the hold existed in the database, protected calls then answered 401, and a second signed-in session of the same account was also refused); a mixed-case name with a trailing space was accepted; the reply was "do not store" with the cookies cleared; the held name was refused at claim with "That name is taken."; and the wait message showed after five tries.

## Open Items

- Widths 390, 768 and 1920 were not checked in the browser, because the window would not resize. Only about 1264 px was checked. This is the same gap as module 13a.
- The browser console was not read for content policy violations in this run.
- Photo removal during a real browser deletion was not tried, because no test drop had a photo. The database test covers it.
- The Privacy page says backups are kept "for a short time". Replace it with the real period once the database provider's restore window is known (PRD Open Questions 11).
- The legal text is a draft and needs a lawyer's review before launch (PRD Open Questions 10).
- The claim page's live check shows a held name as free until the person submits (PRD Open Questions 12).
- Carried over from earlier modules: leftover photo files need a sweep, and the clearing of sender keys after 90 days described in the PRD is not built, so the Privacy page does not promise it.
- A real contact address must be set in the build settings, in the local settings file and on the hosting service, before deploy. The Data Privacy Act registration and a named privacy contact also need deciding.
- A fresh sign-in as an extra step before deleting, and what to do with signed-in accounts that never claimed a link, are left for later.
