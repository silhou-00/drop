# Design Technical Reference

The design system as built: colour, type, spacing, layout widths, motion and the marbled bath. Source: the approved design sheet (rev 6, Marbled Bath). Exact files are listed in [frontend.md](frontend.md).

## Where the values live

| Values                                                                       | File                       | Read as                                          |
| ---------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| Palette, type families, type scale, wrapper spacing, rail and content widths | `src/styles/tokens.css`    | CSS variables on `:root`                         |
| Tailwind mapping of those variables, `3xl` breakpoint, shadcn variables      | `src/index.css`            | `@theme inline`, `@theme`, `:root`               |
| Send page (`--send-*`)                                                       | `src/styles/tokens.css`    | CSS variables on `:root`                         |
| App shell (`--glass-*`, `--inverse-*`, `--app-*`)                            | `src/styles/tokens.css`    | CSS variables on `:root`                         |
| Inbox (`--inbox-*`)                                                          | `src/styles/tokens.css`    | CSS variables on `:root`                         |
| Share panel (`--share-*`)                                                    | `src/styles/tokens.css`    | CSS variables on `:root`                         |
| Motion                                                                       | `src/lib/motion/tokens.ts` | `motionDefaults`, `landingMotion`                |
| Marble                                                                       | `src/lib/marble/tokens.ts` | `marbleDefaults`, `MARBLE_PIGMENTS`, `MARBLE_GL` |

## Colour

Dark follows `prefers-color-scheme` unless the root element carries `data-theme="light"` or `data-theme="dark"`, which wins. The Tailwind `dark:` variant follows the same rule.

| Token           | Tailwind          | Light               | Dark                    |
| --------------- | ----------------- | ------------------- | ----------------------- |
| `--ground`      | `bg-ground`       | `#EDF2F4`           | `#0B0C0F`               |
| `--paper`       | `bg-paper`        | `#FFFFFF`           | `#16181C`               |
| `--ink`         | `text-ink`        | `#0A0A0A`           | `#F5FDFF`               |
| `--ink-2`       | `text-ink-2`      | `#3C474D`           | `#B4BEC3`               |
| `--accent-fill` | `bg-accent-fill`  | `#FF3131`           | `#FF3131`               |
| `--accent-ink`  | `text-accent-ink` | `#B3001B`           | `#FF6B6B`               |
| `--on-accent`   | `text-on-accent`  | `#0A0A0A`           | `#0A0A0A`               |
| `--accent-soft` | `bg-accent-soft`  | `#DFA9AA`           | `#6E3637`               |
| `--ice`         | `bg-ice`          | `#F5FDFF`           | `#46505A`               |
| `--hair`        | `border-hair`     | `rgba(10,10,10,.1)` | `rgba(245,253,255,.12)` |

`--ice` is the sheet's ice/ring colour, renamed so it does not clash with shadcn's `--ring`.

shadcn variables point at these tokens: `background` ground, `foreground` ink, `card` and `popover` paper, `primary` ink, `primary-foreground` paper, `muted-foreground` ink-2, `destructive` accent-ink, `border` and `input` hair, `ring` ink-2. Chart colours stay neutral. There is no `.dark` class block.

## Type

| Family      | Variable           | Tailwind                       | Weights loaded (latin) |
| ----------- | ------------------ | ------------------------------ | ---------------------- |
| Unbounded   | `--family-display` | `font-display`, `font-heading` | 500, 700, 800          |
| Onest       | `--family-body`    | `font-sans`                    | 400, 500, 600, 700     |
| Azeret Mono | `--family-meta`    | `font-mono`                    | 600, 700               |

| Utility              | Size                                           | Line height | Tracking | Weight |
| -------------------- | ---------------------------------------------- | ----------- | -------- | ------ |
| `text-display`       | `clamp(2rem, 1.5rem + 2.5vw, 3.5rem)`          | 1.02        | -0.02em  | 700    |
| `text-heading`       | `clamp(1.6rem, 1.3rem + 1.5vw, 2.5rem)`        | 1.04        | -0.02em  | 700    |
| `text-subheading`    | `clamp(1.1rem, 1rem + 0.5vw, 1.4rem)`          | 1.1         | -0.01em  | 700    |
| `text-message-large` | `clamp(1.5rem, 1.25rem + 1.3vw, 2.1rem)`       | 1.25        | -0.01em  | 500    |
| `text-message`       | `clamp(1.2rem, 1.1rem + 0.5vw, 1.45rem)`       | 1.35        |          | 500    |
| `text-body`          | `clamp(1rem, 0.95rem + 0.25vw, 1.125rem)`      | 1.5         |          |        |
| `text-caption`       | `clamp(0.875rem, 0.85rem + 0.15vw, 0.9375rem)` | 1.35        |          | 600    |
| `text-mono`          | `0.875rem`                                     |             |          | 600    |

## Spacing and bands

| Band               | Media         | Section padding | Section gap | `--rail-w` | `--content-max` |
| ------------------ | ------------- | --------------- | ----------- | ---------- | --------------- |
| Mobile             | below 48rem   | 14px 18px       | 14px        | 0px        | 100%            |
| Tablet             | 48rem (768)   | 20px 24px       | 16px        | 124px      | 640px           |
| Laptop and desktop | 80rem (1280)  | 28px 32px       | 20px        | 252px      | 1120px          |
| Full HD and wider  | 120rem (1920) | 32px 40px       | 24px        | 260px      | 1280px          |

Fixed at every band: sub-section gap 10px, placement gap 8px, container gap 0, all three paddings 0. `.section` is capped at `var(--content-max)`. Tailwind exposes `max-w-content` (`--container-content`), `w-rail` / `pl-rail` (`--spacing-rail`) and the `3xl:` breakpoint (120rem). Tailwind `lg` (1024) is not used.

## App layout

Built in module 12b run A: the frame, the inbox and the drop page. The Map, My link and Settings pages are placeholders until run B. Styles are in `src/styles/app-shell.css`; the components are listed in [frontend.md](frontend.md).

| Band                | Navigation                                                | Notes                                                                                                                                                            |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile              | Glass bottom tab bar with a sliding bead                  | One column. The marbled bath shows behind the header only and fades out below it.                                                                                |
| Tablet, 768 to 1279 | Glass icon rail, 100px wide                               | One column on a near-plain sheet, padded left by `--rail-w` (124px: the rail plus its inset and gap).                                                            |
| 1280 and up         | Labelled rail, 220px wide, logo on top, link card at foot | List pane (`--app-list-w`, 420px, 560px from 120rem) docked to the rail, with a paper reading pane filling the rest. Reading content capped at `--app-read-max`. |

- Selecting a drop pushes its URL, so deep links and Back work. On phones and tablets the list and an open drop take turns; from 80rem both show, with "Pick a drop to read it" in the pane until one is open.
- Glass: `--glass-fill`, `--glass-edge`, `--glass-blur` (18px) and `--glass-saturate` (1.4) on the nav bar, and on the map controls. Below the bar a soft blur (`--app-bar-blur`, `--app-bar-fade`) keeps the labels readable over content.
- Bath mask: `--app-mask-solid` (120px) and `--app-mask-clear` (300px) fade the bath out on phones; a drop's page uses the shorter `--app-mask-detail` (80px).
- Bead: a lead and a slower trail bead melt through the goo filter. Duration and easing come from the `tabSpring` motion token; `--app-bead-lag` (1.6) sets the trail's delay. Under reduced motion the bead jumps without travel.
- Active tab: the icon switches from bold to fill weight. The Inbox tab carries a count badge (`--app-count-size`, `--app-fs-count`), capped at `9+`.
- Map (run B): full bleed at every band. Mobile: paper bottom sheet. Tablet: 380px floating panel. 1280 and up: full-height paper list panel, open by default, with a round collapse control carrying `aria-expanded`.
- Sender: one focused column, at most 560px.
- My link and settings: content held to 1120px.
- Glass appears in at most 3 places per view.

| Token                                                       | Value                                                                                                                                    | Use                                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `--glass-fill`                                              | `rgba(255, 255, 255, 0.72)`; dark `rgba(16, 18, 22, 0.62)`                                                                               | Glass surface                                                            |
| `--glass-edge`                                              | `1px solid rgba(255, 255, 255, 0.7)`; dark `... 0.16)`                                                                                   | Glass border                                                             |
| `--inverse-fill`                                            | `#0a0a0a`; dark `#f5fdff`                                                                                                                | Unread badge and pressed filter chip                                     |
| `--inverse-ink`                                             | `#f5fdff`; dark `#0a0a0a`                                                                                                                | Text on the inverse surface                                              |
| `--app-patch-image`                                         | `comb-land-light.webp`; dark `comb-land-dark.webp`                                                                                       | Marble patch in the empty states                                         |
| `--rail-w`                                                  | `0px`; 48rem `124px`; 80rem `252px`; 120rem `260px`                                                                                      | Left padding for the rail (the nav section's side padding plus the rail) |
| `--app-nav-padding`                                         | `8px 6px`; 48rem `16px 8px`; 80rem `22px 14px`                                                                                           | Nav bar padding                                                          |
| `--app-nav-radius`                                          | `999px`; 48rem `28px`                                                                                                                    | Nav bar radius                                                           |
| `--app-nav-w`                                               | `auto`; 48rem `100px`; 80rem `220px`                                                                                                     | Nav bar width                                                            |
| `--app-tab-min`                                             | `56px`; 48rem `72px`; 80rem `52px`                                                                                                       | Tab minimum size                                                         |
| `--app-tab-radius`                                          | `999px`; 48rem `22px`; 80rem `999px`                                                                                                     | Tab radius                                                               |
| `--app-tab-icon`                                            | `22px`                                                                                                                                   | Tab icon size                                                            |
| `--app-tab-gap`                                             | `2px`; 80rem `14px`                                                                                                                      | Gap between a tab's icon and label                                       |
| `--app-tab-padding`                                         | `0`; 80rem `0 18px`                                                                                                                      | Tab side padding                                                         |
| `--app-fs-tab`                                              | `clamp(0.75rem, 0.72rem + 0.1vw, 0.8rem)`; 48rem `clamp(0.8rem, 0.76rem + 0.1vw, 0.85rem)`; 80rem `clamp(0.95rem, 0.9rem + 0.1vw, 1rem)` | Tab label size                                                           |
| `--app-logo-h`                                              | `32px`; 48rem `34px`; 80rem `52px`                                                                                                       | Logo height                                                              |
| `--app-logo-gap`                                            | `0px`; 48rem `20px`; 80rem `12px`                                                                                                        | Space between the rail logo and the tabs                                 |
| `--app-bar-clearance`                                       | `96px`                                                                                                                                   | Space under the content for the bottom bar                               |
| `--app-bar-blur`                                            | `6px`                                                                                                                                    | Blur under the bar                                                       |
| `--app-bar-fade`                                            | `40px`                                                                                                                                   | Height of the blur's fade                                                |
| `--app-frame-inset`                                         | `12px`                                                                                                                                   | Inset from the screen edge (skip link)                                   |
| `--app-list-w`                                              | `100%`; 80rem `420px`; 120rem `560px`                                                                                                    | List pane width                                                          |
| `--app-read-max`                                            | `860px`                                                                                                                                  | Reading content cap                                                      |
| `--app-sheet-radius`                                        | `32px`                                                                                                                                   | Sheet and reading pane radius                                            |
| `--app-dock-radius`                                         | `28px`                                                                                                                                   | Docked pane radius                                                       |
| `--app-sheet-fill`                                          | `color-mix(in srgb, var(--ground) 94%, transparent)`                                                                                     | Sheet fill                                                               |
| `--app-ring-dot`                                            | `0 0 0 3px var(--paper), 0 0 0 5px var(--accent-soft)`                                                                                   | Ring around the unread dot                                               |
| `--app-chip-min-h`                                          | `44px`                                                                                                                                   | Filter chip height                                                       |
| `--app-chip-padding`                                        | `0 14px`                                                                                                                                 | Filter chip padding                                                      |
| `--app-fs-chip`                                             | `clamp(0.875rem, 0.85rem + 0.1vw, 0.9rem)`                                                                                               | Filter chip text                                                         |
| `--app-bead-dur`, `--app-bead-ease`                         | `420ms`, spring overshoot curve (overridden from `tabSpring`)                                                                            | Bead travel                                                              |
| `--app-bead-lag`                                            | `1.6`                                                                                                                                    | Trail bead delay multiple                                                |
| `--app-bead-inset`                                          | `6px`; 48rem `0px`                                                                                                                       | Bead inset in its cell                                                   |
| `--app-count-size`                                          | `18px`                                                                                                                                   | Unread badge size                                                        |
| `--app-fs-count`                                            | `0.6875rem`                                                                                                                              | Unread badge text                                                        |
| `--app-foot-padding`                                        | `14px`                                                                                                                                   | Link card padding at the rail's foot                                     |
| `--app-foot-radius`                                         | `20px`                                                                                                                                   | Link card radius at the rail's foot                                      |
| `--app-mask-solid`, `--app-mask-clear`, `--app-mask-detail` | `120px`, `300px`, `80px`                                                                                                                 | Bath fade on phones                                                      |
| `--shadow-rest`, `--shadow-lift`                            | `0 4px 30px rgba(10, 10, 10, 0.08)`, `0 12px 32px -14px rgba(10, 10, 10, 0.18)`                                                          | Resting and raised shadow                                                |

Deviations from the comps:

- Cards follow the later responsive comps: plain cards, no carousel.
- The comp's "..." menu became a read or unread toggle, because block and report were dropped.
- "Placed by hand" became a GPS badge, because every drop is placed by GPS.
- No bell, and no Pins chip. Alerts arrive outside the app and their switch goes in Settings; the Inbox tab badge does the bell's job in the app.
- The gooey tab bar and the glass map controls were rebuilt in the project's own code; nothing was copied and no package was added.
- The unread badge fills only after the inbox has loaded once.

## Motion

`motionDefaults` (tweakable under the Motion folder). Durations in ms.

| Token           | Duration | Easing         | Extra                                   |
| --------------- | -------- | -------------- | --------------------------------------- |
| `pressFeedback` | 140      | easeOutCubic   | scale 0.97                              |
| `rippleReveal`  | 950      | easeOutCubic   |                                         |
| `letterStagger` | 600      | easeOutCubic   | step 30 per letter                      |
| `nudge`         | 520      | easeOutBack    | distance 6                              |
| `iris`          | 760      | easeOutQuart   |                                         |
| `lightSweep`    | 950      | easeInOutCubic | loops                                   |
| `marbleDrift`   | 60000    | linear         |                                         |
| `shaderFadeIn`  | 400      | easeOutCubic   | marble canvas fade in                   |
| `tabSpring`     |          |                | `SPRINGS.springSnappy`                  |
| `reducedFade`   | 200      | linear         | opacity only, used under reduced motion |

The module 02 tokens (`fadeSlide`, `overshoot`, `bounceLand`, `springFollow`, `popScale`, `squash`, `stagger`) are unchanged.

`landingMotion` holds the landing comp's values (`window.__bath.T` in `bath.js`) one to one: `rise`, `split`, `zoom`, `comb`, `curtain`, `track`, `kq`, `lift`, `scramble`, `iris`, `ripple`. It holds arrays, so it is not on the tweak panel.

## Marble

Combed Veins, a WebGL1 fragment shader ported from the landing comp. The landing adds its scene on top (streets, camera, clip, ripple); left at defaults the bath looks as it does without.

**Tokens** (`marbleDefaults`, Marble folder):

| Token                                                    | Default          | Range     |
| -------------------------------------------------------- | ---------------- | --------- |
| `variant`                                                | `comb`           | `comb`    |
| `intensityContent` / `intensityChrome` / `intensityHero` | 0.32 / 0.5 / 0.7 | 0 to 1    |
| `saturation`                                             | 0.55             | 0 to 1    |
| `pigmentContrast`                                        | 0.6              | 0 to 1    |
| `accentShare` / `accentShareHero`                        | 0.14 / 0.05      | 0 to 0.5  |
| `contentFade`                                            | 0.96             | 0 to 1    |
| `fadeLength`                                             | 160 (px)         | 0 to 400  |
| `lineGap`                                                | 9                | 4 to 30   |
| `lineWidth`                                              | 1.4              | 0.5 to 4  |
| `waveAmp`                                                | 8                | 0 to 40   |
| `wavePitch`                                              | 90               | 20 to 300 |
| `wideScale`                                              | 2.2              | 1 to 3    |

**Pigments** (`MARBLE_PIGMENTS`): light ground `#EDF2F4`, grey `#7C858B`, ice `#F5FDFF`, ring `#E36B6E`, street `#9EA8AD`; dark ground `#0B0C0F`, grey `#59616A`, ice `#46505A`, ring `#46505A`, street `#59616A`; red `#FF3131` in both. The dark street value is not on the sheet; the landing is always light. With `I` the zone intensity: grey = mix(ground, mix(ground, grey, pigmentContrast), I); pale = midpoint of ground and grey; ice = mix(ground, ice, min(1, I*1.2)); red = mix(ground, desaturate(red, saturation), I); ring = mix(ground, ring, min(1, I/0.7)).

**Frames.** The canvas is cover-fitted to a reference frame: portrait 390x844, landscape 1440x900 (chosen by aspect). In landscape, line gap, wave amplitude and pitch are scaled by `wideScale` and line width by its square root.

**Renderer** (`createMarble(canvas, tokens, { zone, mode, driftPeriod, onFail })`): returns `{ setUniforms, setProgress, setCamera, setScene, setClip, frame, pause, resume, destroy }`, or `null` when WebGL or the shader fails at once. Later failures call `onFail` with `no-webgl`, `shader`, `context-lost` or `slow`.

| `MARBLE_GL`       | Value | Meaning                                             |
| ----------------- | ----- | --------------------------------------------------- |
| `dprCap`          | 1.25  | device pixel ratio ceiling                          |
| `idleFps`         | 30    | frame rate after the first 3.5s or a change         |
| `slowMs`          | 40    | median frame time (40 samples) that counts as slow  |
| `fallbackQuality` | 0.7   | resolution step taken once before failing as `slow` |

The renderer pauses when the canvas is offscreen (IntersectionObserver) or the tab is hidden, and resizes with a ResizeObserver. `setProgress(p)` sets the ink spread: 1 (default) is the full bath, 0 is grey with no impact pool. `setCamera({ point, anchor, zoom })` holds a frame point at a screen anchor; `setClip({ x, y, w, h })` limits shading to a rectangle; `setScene` sets `comb`, `calm`, `impactTime`, `impactPoint`, `ripple`, `streets`, `redStreet`, `accent`. With `external: true` the renderer runs no loop and draws when the caller calls `frame(now)`. `referenceFrame(width, height, tokens)` returns the fitted frame and its line metrics. `destroy` deletes the buffer and program and keeps the context, so a remount on the same canvas works.

**Component** (`<MarbleBackground variant intensity className>`): fills its positioned parent, `aria-hidden`, no pointer input. Shows the still `/marble/<variant>-<port|land>-<light|dark>.webp` first (landscape at `min-aspect-ratio: 1/1`), then fades the canvas in over `shaderFadeIn`. Under reduced motion or after a failure only the still shows. The `content` zone adds a ground veil at `contentFade` opacity, masked transparent to opaque over `fadeLength` px from the top.

**Stills** (`public/marble/`), generated from the renderer at chrome intensity: `comb-port-light.webp` 30.0KB, `comb-port-dark.webp` 29.1KB, `comb-land-light.webp` 47.0KB, `comb-land-dark.webp` 48.2KB.

## Brand

`public/brand/logo.svg` (light) and `public/brand/logo-dark.svg` (dark), copied from the comps.

## Landing

Ported from the approved landing comp (concept A, "The Bath"). Styles in `src/styles/landing.css`, scoped under `.landing`; tokens in `src/styles/tokens.css` and `src/lib/landing/tokens.ts`.

- **Theme.** Light only. The route forces `data-theme="light"` while mounted.
- **Bands.** The landing follows the comp's own steps, not the app bands: mobile below 48rem (768), wide at `64rem and (min-aspect-ratio: 21/20)`, full HD at 120rem (1920, gutter 80px).
- **Variables.** `--on-dark-*` (ink on dark ground), `--landing-glass`, `--landing-shadow`, `--landing-e-*` (easings), rise variables, and `--landing-s1-pad`, `--landing-s2-gap`, `--landing-s3-gap`, `--landing-gutter`, `--landing-nav-h`, `--landing-max`, `--landing-fs-*` (all type in `clamp()`).
- **Lengths.** Beat 06 (kept quiet) is 515svh, as in the comp. The claim band is 185svh (comp: 200svh), trimmed to remove paper before the footer.
- **Motion.** `landingMotion` values unchanged, plus `load`, `card`, `streets` and `shader.accent` (0.13) in `landingDefaults`.
- **Stills** (`public/landing/`): `still-<port|land>-<comb|grey|ink>.webp`, 29.1KB to 47.8KB, from the comp.

## Send page

The public page at `/<name>`. Styles in `src/styles/send.css`, scoped under `.auth-page`; tokens in `src/styles/tokens.css`. Light and dark follow the same rule as the rest of the app.

- **Auth shell reuse.** The page sits in `AuthShell` (marble content zone, logo bar, centred main) and its card is the auth card (`.auth-card`) with the `auth-*` field, button, title and note classes, widened to `--send-card-max`. Nothing in `auth.css` changed.
- **Wrapper levels.** Section, sub-section (the card), placement and container are all present. The form uses `display: contents` so its placements sit directly in the card.
- **Place row.** Once there is a GPS fix, a rounded row (`--send-place-padding`, `--send-place-radius`) shows the coordinates and a refresh button.
- **Photo field.** A kept photo shows a square preview (`--send-photo-thumb`, `--send-photo-radius`) with its size and a remove button (`--send-icon-btn`).

| Token                  | Value                                    | Use                                 |
| ---------------------- | ---------------------------------------- | ----------------------------------- |
| `--send-card-max`      | `35rem` (560px)                          | Card width cap                      |
| `--send-avatar-size`   | `clamp(2.75rem, 2.5rem + 1vw, 3.25rem)`  | Avatar or initial circle            |
| `--send-fs-avatar`     | `clamp(1.1rem, 1rem + 0.5vw, 1.35rem)`   | Initial letter size                 |
| `--send-message-min-h` | `7.5rem`                                 | Message box minimum height          |
| `--send-icon-size`     | `1.25em`                                 | Icons in buttons                    |
| `--send-icon-btn`      | `44px`                                   | Round icon button (refresh, remove) |
| `--send-place-padding` | `12px 14px`                              | Place row padding                   |
| `--send-place-radius`  | `16px`                                   | Place row radius                    |
| `--send-sent-size`     | `clamp(2.75rem, 2.4rem + 1.5vw, 3.5rem)` | Check mark on the sent card         |
| `--send-photo-thumb`   | `clamp(4rem, 3.5rem + 2vw, 5rem)`        | Photo preview size                  |
| `--send-photo-radius`  | `12px`                                   | Photo preview radius                |

## Inbox

The list at `/inbox` and a drop at `/inbox/<id>`, inside the app frame. Styles in `src/styles/inbox.css`, scoped under `.auth-page`; tokens in `src/styles/tokens.css`. They build on the auth button, note and status classes and on the app shell. Light and dark follow the rest of the app, except the map, which always uses the light Drop palette.

- **Wrapper levels.** Each part of the page is a section with sub-sections, placements and containers. The card is a link whose inner spans carry the same structure as inline text rows.
- **Heading and chips.** The title with an "N new" count, then the All, Unread and Photos pill chips (`--app-chip-min-h`, pressed state shown by `--inverse-fill`). On phones the logo sits above the title.
- **Cards.** Paper cards grouped under Today and Earlier, with a `--inbox-item-border` border and `--inbox-item-radius` corners. Each shows the message (`--inbox-fs-card`, `--inbox-item-lines` lines), a place badge, a Photo badge and a compact age. An unread card has a red dot (`--inbox-dot-size`) ringed by `--app-ring-dot`. The open drop's card is marked active.
- **Empty states.** A marble patch (`--app-patch-image`, `--inbox-patch-w`, `--inbox-patch-ratio`) with the card pinned to its foot; the stage is at least `--inbox-empty-min-h` tall.
- **Drop page.** A bar with a back button (hidden from 80rem, where the list is beside it), the day and time, and a round read toggle. The message sits large (`--inbox-fs-read`) in a padded card (`--inbox-message-padding`). Below: the place and GPS badges, then the media row: the map and the photo stacked on phones, side by side from 48rem. From 80rem the drop fills the paper reading pane, its body scrolls and its actions stay pinned.
- **Photo.** A circle, `--inbox-photo-w` wide, ringed by `--inbox-photo-ring` (`--inbox-photo-ring-w` thick). It is blurred by `--inbox-photo-blur` under a veil of `--inbox-photo-veil` and a "Tap to view photo" label until tapped, then clear. A second tap opens the whole photo uncropped in a 4:5 frame (`--inbox-photo-ratio`, `--inbox-photo-radius`) across the media row. A failed load shows text.
- **Map.** A plate with ratio `--inbox-map-ratio` and radius `--inbox-map-radius`. Glass buttons (`--inbox-map-ctl` size, `--inbox-map-ctl-gap`, `--inbox-map-ctl-inset`, `--inbox-map-ctl-radius`) zoom in, zoom out and recentre. An "About 150 m" label (`--inbox-map-label-padding`) and the credit links sit in the corners on `--inbox-credit-bg` and `--inbox-credit-ink`. The drop's area is a circle of about 150 m in `--accent-fill`, the only colour on a map drawn in the grey marble pigments. While the map chunk loads, a placeholder holds the same shape.
- **Actions.** A "Share to story" pill (the ink button) and a round delete button (`--inbox-iconbtn`, `--inbox-icon`).
- **Delete step.** An in-page panel (`--inbox-confirm-padding`, `--inbox-confirm-radius`) with Delete and Cancel side by side. It is not a modal.

| Token                       | Value                                                                          | Use                               |
| --------------------------- | ------------------------------------------------------------------------------ | --------------------------------- |
| `--inbox-item-padding`      | `16px 18px`; from 48rem `18px 20px`                                            | Drop card padding                 |
| `--inbox-item-gap`          | `10px`                                                                         | Gap inside a drop card            |
| `--inbox-item-radius`       | `22px`                                                                         | Drop card radius                  |
| `--inbox-item-border`       | `2px`                                                                          | Drop card border                  |
| `--inbox-item-lines`        | `3`                                                                            | Message lines shown on a card     |
| `--inbox-fs-card`           | `clamp(1.0625rem, 1rem + 0.3vw, 1.2rem)`                                       | Card message                      |
| `--inbox-fs-badge`          | `clamp(0.8125rem, 0.8rem + 0.1vw, 0.85rem)`                                    | Badge text                        |
| `--inbox-fs-read`           | `clamp(1.35rem, 1.2rem + 1vw, 1.6rem)`; from 48rem `var(--type-message-large)` | Drop message                      |
| `--inbox-badge-min-h`       | `30px`                                                                         | Badge height                      |
| `--inbox-badge-padding`     | `0 10px`                                                                       | Badge padding                     |
| `--inbox-badge-icon`        | `0.95rem`                                                                      | Badge icon size                   |
| `--inbox-dot-size`          | `10px`                                                                         | Unread dot                        |
| `--inbox-iconbtn`           | `44px`                                                                         | Round icon button                 |
| `--inbox-icon`              | `20px`                                                                         | Icon size in round buttons        |
| `--inbox-empty-min-h`       | `clamp(18rem, 50svh, 26rem)`                                                   | Empty stage height                |
| `--inbox-empty-inset`       | `14px`                                                                         | Empty card inset                  |
| `--inbox-empty-padding`     | `18px`                                                                         | Empty card padding                |
| `--inbox-patch-w`           | `clamp(10rem, 14vw, 14rem)`                                                    | Marble patch width                |
| `--inbox-patch-ratio`       | `11 / 8`                                                                       | Marble patch shape                |
| `--inbox-patch-radius`      | `24px`                                                                         | Marble patch radius               |
| `--inbox-message-padding`   | `20px 18px`                                                                    | Drop message card padding         |
| `--inbox-map-ratio`         | `16 / 10`; from 48rem `4 / 3`                                                  | Map plate shape                   |
| `--inbox-map-radius`        | `22px`                                                                         | Map plate radius                  |
| `--inbox-map-ctl`           | `44px`                                                                         | Map button size                   |
| `--inbox-map-ctl-gap`       | `2px`                                                                          | Gap between map buttons           |
| `--inbox-map-ctl-inset`     | `10px`                                                                         | Map button group inset            |
| `--inbox-map-ctl-radius`    | `16px`                                                                         | Map button group radius           |
| `--inbox-map-label-padding` | `4px 10px`                                                                     | "About 150 m" label padding       |
| `--inbox-credit-bg`         | `rgba(255, 255, 255, 0.86)`                                                    | Credit label background           |
| `--inbox-credit-ink`        | `#3c474d`                                                                      | Credit label ink                  |
| `--inbox-photo-w`           | `62%`; from 48rem `100%`                                                       | Photo circle width                |
| `--inbox-photo-ring`        | `0 0 0 6px var(--paper), 0 0 0 9px var(--accent-soft)`                         | Photo ring                        |
| `--inbox-photo-ring-w`      | `9px`                                                                          | Photo ring thickness              |
| `--inbox-photo-ratio`       | `4 / 5`                                                                        | Full photo frame shape            |
| `--inbox-photo-radius`      | `22px`                                                                         | Full photo frame radius           |
| `--inbox-photo-blur`        | `28px`                                                                         | Blur before the photo is revealed |
| `--inbox-photo-veil`        | `rgba(10, 10, 10, 0.28)`                                                       | Veil over the blurred photo       |
| `--inbox-media-gap`         | `18px`                                                                         | Gap between map and photo         |
| `--inbox-confirm-padding`   | `16px`                                                                         | Delete step padding               |
| `--inbox-confirm-radius`    | `22px`                                                                         | Delete step radius                |

The map style (`src/lib/map/style.ts`) takes land from the light ground pigment, areas and water from mixes of ground and grey, roads from paper, and labels from ink-2.

## Share panel

The story panel on a drop's page. Styles in `src/styles/share.css`, scoped under `.auth-page`; tokens in `src/styles/tokens.css`. It builds on the inbox button, note and action row classes. The 9:16 preview is held to `--share-preview-max-h`. The story image itself is drawn on a canvas with fixed pixel values from `src/lib/share/model.ts`, always on the light palette.

| Token                    | Value                                    | Used for           |
| ------------------------ | ---------------------------------------- | ------------------ |
| `--share-panel-padding`  | `16px`; from 48rem `20px`                | Panel padding      |
| `--share-panel-radius`   | `16px`                                   | Panel radius       |
| `--share-preview-max-h`  | `min(62svh, 40rem)`                      | Preview height cap |
| `--share-preview-radius` | `14px`                                   | Preview radius     |
| `--share-preview-shadow` | `0 8px 28px -12px rgba(10, 10, 10, 0.3)` | Preview shadow     |
| `--share-fs-title`       | `clamp(1rem, 0.95rem + 0.3vw, 1.2rem)`   | Panel heading      |
| `--share-close-size`     | `44px`                                   | Close button size  |
| `--share-switch-w`       | `52px`                                   | Switch width       |
| `--share-switch-h`       | `32px`                                   | Switch height      |
| `--share-switch-knob`    | `24px`                                   | Switch knob size   |
| `--share-switch-inset`   | `4px`                                    | Switch knob inset  |

## Scrollbar

Option A, "Hairline", from the scrollbar sheet. Values in `src/lib/scrollbar/tokens.ts`.

| Group      | Values                                                                                                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shared`   | edge 6, hit 18, hideDelay 1200ms, fadeIn 140ms, fadeOut 320ms, inkLight `#3C474D`, inkDark `#B4BEC3`, trackLight `rgba(10,10,10,.10)`, trackDark `rgba(245,253,255,.16)`, zIndex 7 |
| `hairline` | width 10, idleScale 0.4, minThumb 44, radius 999                                                                                                                                   |
| `area`     | width 10, inkLight `rgba(60,71,77,.55)`, inkLightHover `#3C474D`, inkDark `rgba(180,190,195,.5)`, inkDarkHover `#B4BEC3`                                                           |

Fine pointers only. The ink crossfades to `inkDark` over dark ground. The sheet's top (84) and bottom (24) insets are not used by the hairline and are not stored.
