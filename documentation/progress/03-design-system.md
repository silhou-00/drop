# 03 Design System

**Status:** Done
**Date:** October 28, 2026
**Traces to:** Request to turn the approved design sheet (revision 6, Marbled Bath) into the app's design system

Technical detail: [design](../technical/design.md) and [frontend](../technical/frontend.md).

## Goal

Put the approved look of Drop into the app itself, so every page built from now on starts from the same colours, lettering, spacing and movement, and sits on the same marbled background. Replace the earlier stand-in pieces that the approved design no longer uses.

## What Was Built

- The Drop colour set, in a light version and a dark version. The app follows the device's light or dark setting, and the app can also force one or the other.
- Three typefaces from the sheet: a wide display face for headings, a plain face for reading text, and a fixed-width face for small labels. Only the weights the design uses are loaded.
- A full text size scale, from large titles to captions and messages, that grows and shrinks smoothly with the screen.
- Spacing for the four page wrapper levels that steps up at each screen-size band, plus the widths the app layout will use: room for the side rail on tablets and wider screens, and a cap on how wide content can stretch.
- The new movement set from the sheet: press feedback, ripple reveal, letters arriving one after another, a small nudge, an iris wipe for switching light and dark, a light sweep, the slow drift of the background, and a quiet fade used when a visitor asks for less motion. The landing page's movement values are stored alongside them, unchanged.
- The marbled bath: a background of combed, wavy lines in grey, pale blue and a little red, drawn live by the graphics chip and drifting very slowly. It has three strengths, for behind content, behind the app's frame, and behind the hero areas. Behind content, it fades to near-plain ground so text stays easy to read.
- A still picture of the bath for every case (tall and wide screens, light and dark). It shows first, while the live version starts, and stays on its own when the device asks for less motion or the live version cannot run.
- The Drop logo as clean vector files, for light and dark.
- A practice page for the bath with every value on a slider, in place of the old text-art logo practice page.

## Decisions & Trade-offs

- **The text-art logo was removed.** The approved design uses the real logo, so the animated text-art version from module 02 and the borrowed animation engine behind it were taken out, together with its source image and the old body typeface.
- **A simpler class-joining helper.** The small package that merged style names was swapped for the two packages the interface library expects, so style names that clash resolve the way the library assumes.
- **The bath is protected against slow or missing graphics.** It draws at a reduced resolution, pauses when it is off screen or the tab is hidden, slows to a lower frame rate once it has settled, steps its quality down once if frames are slow, and gives up to the still picture if they stay slow, or if the graphics chip is missing or fails.
- **The still comes first.** The page never waits for the live bath. The still is the first thing seen, and the live version fades in over it, so slow devices and reduced motion both get a finished-looking background.
- **The stills were made from the app's own bath.** They match the live version exactly. They were kept under 50 kilobytes each. Only the frame strength has a still for now; the other two strengths show it too until they get their own.
- **Some colour names were changed to fit.** The sheet's pale blue ring colour is stored as "ice", and the bright red as "accent fill", so they do not collide with names the interface library already uses.
- **The app layout is written down, not built.** The rail, tab bar, list and reading pane sizes from the sheet are recorded in the technical reference and the widths are ready, but no page uses them yet. They arrive with the first real pages.
- **The landing page's movement values are stored as they are.** They are lists of numbers rather than single values, so they are not on the tuning panel.

## Security Pass

**Server**

- Are all inputs checked against a strict shape? Not applicable. This module adds no server code.
- Do protected endpoints check who is calling? Not applicable, no endpoints were added.
- Are database queries safe from injection? Not applicable, there is no database access.
- Are state-dependent writes checked inside a transaction? Not applicable, nothing is written.
- Is anything secret or personal logged or shown in an error? No. The module logs nothing.
- Are endpoints rate-limited? Not applicable, no endpoints were added.

**Web app**

- Is any secret in the web app's code? No. The module uses no keys or settings, and the release build was searched for secret-like text.
- Is any token or personal data kept in browser storage or a web address? No. Nothing is stored.
- Is server or user content shown as raw HTML? No. The bath is drawn on a canvas and all text is plain text.
- Are unchecked values placed in links, image sources, or styles? No. The still picture addresses are built only from the project's own fixed names, and the values placed in styles come from the project's defaults or the developer's own panel, which never ships.
- Do outside links carry the safe-link attributes? There are no outside links.
- Do forms block double submits? There are no forms.
- Does a failed sign-in hide which field was wrong? Not applicable, there is no sign-in here.
- Was debug logging removed? Yes. No logging was added.
- Does anything meant only for development reach the release version? No. The release build was searched for the tuning panel library and none was found. The bath practice page shows "not found" in the release build.

## Verification

- Installed, linted, type checked, built and format checked the project; all passed.
- Searched the release build for the tuning panel library and for secret-like text; nothing was found.
- Opened the bath practice page in a real browser at phone width and at laptop width, in light and dark, with and without reduced motion. There were no errors in any of the eight cases. Without reduced motion the live bath appeared; with it, only the matching still appeared. The new typefaces loaded and the page background was the ground colour in both modes.
- Found and fixed a fault where the live bath failed to appear on the second start of the page during development: closing it down had switched off the graphics context it needed to start again.

## Open Items

- The app layout (rail, tab bar, list, reading pane, map panels) is specified but not built.
- Stills exist only for the frame strength of the bath. The content and hero strengths reuse it.
- Where exactly the content-strength fade starts is a first guess and should be checked once real pages exist.
- The light and dark switch with its iris wipe is not built yet; only the ability to force a mode is in place.
