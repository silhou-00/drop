# Design Technical Reference

The design system as built: colour, type, spacing, layout widths, motion and the marbled bath. Source: the approved design sheet (rev 6, Marbled Bath). Exact files are listed in [frontend.md](frontend.md).

## Where the values live

| Values                                                                       | File                       | Read as                                          |
| ---------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------ |
| Palette, type families, type scale, wrapper spacing, rail and content widths | `src/styles/tokens.css`    | CSS variables on `:root`                         |
| Tailwind mapping of those variables, `3xl` breakpoint, shadcn variables      | `src/index.css`            | `@theme inline`, `@theme`, `:root`               |
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
| Tablet             | 48rem (768)   | 20px 24px       | 16px        | 104px      | 640px           |
| Laptop and desktop | 80rem (1280)  | 28px 32px       | 20px        | 244px      | 1120px          |
| Full HD and wider  | 120rem (1920) | 32px 40px       | 24px        | 244px      | 1280px          |

Fixed at every band: sub-section gap 10px, placement gap 8px, container gap 0, all three paddings 0. `.section` is capped at `var(--content-max)`. Tailwind exposes `max-w-content` (`--container-content`), `w-rail` / `pl-rail` (`--spacing-rail`) and the `3xl:` breakpoint (120rem). Tailwind `lg` (1024) is not used.

## App layout

**Specified, not built.** The values below come from the sheet; no page uses them yet.

| Band                | Navigation                                  | Notes                                                                                                                                           |
| ------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile              | Glass bottom tab bar, 72px                  |                                                                                                                                                 |
| Tablet, 768 to 1279 | Glass icon rail, 80px                       | `--rail-w` 104 includes the 12px inset and gap                                                                                                  |
| 1280 and up         | Labelled rail, 220px, link card at its foot | Rail, list and reading pane are full height, each 12px from top and bottom. List 420px at 1280, 560px at 1920. Reading content capped at 860px. |

- Selecting a drop pushes its URL, so deep links and Back work.
- Map: full bleed at every band. Mobile: paper bottom sheet. Tablet: 380px floating panel. 1280 and up: full-height paper list panel, open by default, with a round collapse control carrying `aria-expanded`.
- Sender: one focused column, at most 560px.
- My link and settings: content held to 1120px.
- Glass appears in at most 3 places per view.

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

Combed Veins, a WebGL1 fragment shader ported from the landing comp without streets, camera or scroll.

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

**Pigments** (`MARBLE_PIGMENTS`): light ground `#EDF2F4`, grey `#7C858B`, ice `#F5FDFF`, ring `#E36B6E`; dark ground `#0B0C0F`, grey `#59616A`, ice `#46505A`, ring `#46505A`; red `#FF3131` in both. With `I` the zone intensity: grey = mix(ground, mix(ground, grey, pigmentContrast), I); pale = midpoint of ground and grey; ice = mix(ground, ice, min(1, I*1.2)); red = mix(ground, desaturate(red, saturation), I); ring = mix(ground, ring, min(1, I/0.7)).

**Frames.** The canvas is cover-fitted to a reference frame: portrait 390x844, landscape 1440x900 (chosen by aspect). In landscape, line gap, wave amplitude and pitch are scaled by `wideScale` and line width by its square root.

**Renderer** (`createMarble(canvas, tokens, { zone, mode, driftPeriod, onFail })`): returns `{ setUniforms, setProgress, pause, resume, destroy }`, or `null` when WebGL or the shader fails at once. Later failures call `onFail` with `no-webgl`, `shader`, `context-lost` or `slow`.

| `MARBLE_GL`       | Value | Meaning                                             |
| ----------------- | ----- | --------------------------------------------------- |
| `dprCap`          | 1.25  | device pixel ratio ceiling                          |
| `idleFps`         | 30    | frame rate after the first 3.5s or a change         |
| `slowMs`          | 40    | median frame time (40 samples) that counts as slow  |
| `fallbackQuality` | 0.7   | resolution step taken once before failing as `slow` |

The renderer pauses when the canvas is offscreen (IntersectionObserver) or the tab is hidden, and resizes with a ResizeObserver. `setProgress(p)` sets the ink spread: 1 (default) is the full bath, 0 is grey with no impact pool. `destroy` deletes the buffer and program and keeps the context, so a remount on the same canvas works.

**Component** (`<MarbleBackground variant intensity className>`): fills its positioned parent, `aria-hidden`, no pointer input. Shows the still `/marble/<variant>-<port|land>-<light|dark>.webp` first (landscape at `min-aspect-ratio: 1/1`), then fades the canvas in over `shaderFadeIn`. Under reduced motion or after a failure only the still shows. The `content` zone adds a ground veil at `contentFade` opacity, masked transparent to opaque over `fadeLength` px from the top.

**Stills** (`public/marble/`), generated from the renderer at chrome intensity: `comb-port-light.webp` 30.0KB, `comb-port-dark.webp` 29.1KB, `comb-land-light.webp` 47.0KB, `comb-land-dark.webp` 48.2KB.

## Brand

`public/brand/logo.svg` (light) and `public/brand/logo-dark.svg` (dark), copied from the comps.
