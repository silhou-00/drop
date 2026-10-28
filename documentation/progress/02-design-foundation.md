# 02 Design Foundation

**Status:** Done
**Date:** October 27, 2026
**Traces to:** Request for a design foundation before the first real pages (tweakable visual values, motion, gooey shapes, the animated logo)

Technical detail: [frontend](../technical/frontend.md).

> **Note:** Module 03 (design system) removed the animated text-art logo and its body typeface. The approved design uses the vector logo instead. See [03 Design System](03-design-system.md).

## Goal

Give the web app a shared set of visual building blocks, and a way to tune every visual value by eye in the browser, before the first real pages are designed. Nothing used only for tuning may reach the version people actually visit.

## What Was Built

- While the app runs on a developer's machine, a control panel shows sliders, colour pickers, text fields and switches for every visual value in use. Moving a slider changes the page at once.
- A "Copy values" button copies every value in the panel, so a setting that looks right can be pasted back into the project as the new default.
- A small badge in the corner names the screen-size band the page is being viewed at (mobile, tablet, laptop and desktop, full HD and wider), with the exact width.
- A named set of movements for the whole app: fade and slide in, overshoot, bounce landing, spring follow, pop in, squash, and a stagger step for starting items one after another. Each has a set duration and speed curve.
- A gooey effect: shapes that come close melt into each other like liquid.
- An animated text-art version of the Drop logo. The logo is drawn as a grid of letters and symbols, with the pin in its own red. Under the pointer the letters melt and drip down, then spring back; a press sends out a ripple; when nobody touches it, it wobbles gently. Screen readers hear "Drop" instead of the drawing.
- Shared spacing for the four page wrapper levels and a text size scale that grows and shrinks smoothly with the screen.
- Practice pages, one per building block, where each one can be seen and tuned on its own. They exist only on a developer's machine.

## Decisions & Trade-offs

- **Tuning tools only in development.** The project is set up so that, when it is built for release, the control panel, the screen-size badge and their library are left out entirely. The release version uses the saved defaults. The cost is that the tuning panel cannot be used on the live site, which is the point.
- **A ready-made control panel library.** It works with the current version of the interface library, so it was used as planned rather than the backup option.
- **Practice pages answer "not found" in the released app.** Their small page files are still part of the release build but can never be shown. Removing them from the build completely would have meant the page list changes between development and release, which makes the setup fragile.
- **The gooey effect was built from the standard technique, not copied.** The free component it was modelled on comes from a site whose terms forbid copying its material, and its page does not show how it is built. The effect was rebuilt from the well-known approach (blur shapes together, then sharpen the edge back) and from watching how the original behaves.
- **The logo animation borrows its engine from an open-source project.** The loop, the pausing, the reduced-motion handling and the letter drawing were adapted from a freely licensed text-art animation, with its licence kept alongside the code and credited in it.
- **The faint logo outline is drawn with light characters.** The outline in the source image is almost white. Drawing it with the heaviest symbols made the letters run together, so it uses the lightest ones and a soft blue colour.
- **Movements use the browser's own animation support.** No animation library was added. Curves that the browser cannot describe directly, like bounce and spring, are converted into a form it can play.
- **Respecting reduced motion.** When a visitor's device asks for less motion, the logo shows a single still picture and never starts animating, including after a click.

## Security Pass

**Server**

- Are all inputs checked against a strict shape? Not applicable. This module adds no server code and sends nothing to the server.
- Do protected endpoints check who is calling? Not applicable, no endpoints were added.
- Are database queries safe from injection? Not applicable, there is no database access in this module.
- Are state-dependent writes checked inside a transaction? Not applicable, nothing is written.
- Is anything secret or personal logged or shown in an error? No. The module logs nothing.
- Are endpoints rate-limited? Not applicable, no endpoints were added.

**Web app**

- Is any secret in the web app's code? No. The module uses no keys or settings.
- Is any token or personal data kept in browser storage or a web address? No. The tuning panel keeps its values in memory only.
- Is server or user content shown as raw HTML? No. All text is plain text, and the logo is drawn onto a canvas.
- Are unchecked values placed in links, image sources, or styles? No. The logo image address is fixed in the code, and the values placed in styles come from the project's own defaults or from the developer's own panel, which never ships.
- Do outside links carry the safe-link attributes? There are no outside links.
- Do forms block double submits? There are no forms.
- Does a failed sign-in hide which field was wrong? Not applicable, there is no sign-in here.
- Was debug logging removed? Yes. No logging was added.
- Does anything meant only for development reach the release version? No. The release build was searched for the control panel library and for the panel and badge themselves, and none of them were found. The practice pages show "not found" in the release build.

## Verification

- Installed, built, linted, type checked and format checked the project; all passed.
- Searched the release build for the control panel library and the development-only panel and badge; nothing was found.
- Served the release build and opened every practice page: each showed "not found", with no panel and no badge; the home page still loaded.
- Opened the practice pages on a developer's machine: the logo drew correctly, changing the cell size and the letter colour in the panel changed the drawing straight away, the letters melted under the pointer, two blobs merged when dragged together, changing the blur changed the effect, and "Copy values" copied the current values.
- With reduced motion turned on, the logo stayed exactly the same picture even after a click. With it off, the logo kept moving.

## Open Items

- The practice page files are part of the release build even though they cannot be shown. Leaving them out entirely is possible later if it is worth the extra setup.
- The text-art logo is a starting point: its final size, colours and melt feel are still to be tuned with the panel against the real landing page.
- Only one gooey shape demo exists; real interface pieces that use the effect come with the pages that need them.
