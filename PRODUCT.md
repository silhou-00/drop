# Product

<!-- impeccable:product-schema 1 -->

Source: `document/prd_drop_webapp.md` v2.1 (2026-10-27), `document/logo.jpg`, `.claude/rules/frontend.md`,
and the design brief of 2026-10-27. Facts marked _(inferred)_ were not stated in those sources and were
derived from them without an interview round; confirm or correct them.

## Platform

web

## Users

- **Sender (no account).** Typically a university student or young adult (anyone can send), who taps a `drop.link/<username>`
  link inside someone's Instagram or TikTok story. They arrive in that app's in-app browser, on a phone,
  usually mid-scroll, and want to say something anonymously in under a minute, with a clue about where
  they were.
- **Recipient (has an account).** The person who owns the link. They post the link to their story, read
  drops in an inbox, guess who sent each one from the place and photo, and post the best ones back to their
  story as a 9:16 card.
- **Secondary:** creators and event organisers who want location-based audience interaction.
- **Not served:** no one is excluded by age. Drop is Accessible by All, and sign-up asks no age question.
  This is an open risk to settle before launch (minors, privacy law, app store ratings).

## Product Purpose

Drop is an anonymous messaging web app that ties a note to a real place. Anyone with a user's link can send
them an anonymous message of up to 280 characters, optionally with an approximate location (GPS or a pin
placed by hand) and a photo. The place and photo turn a plain anonymous inbox into a guessing game, and that
curiosity drives sharing.

Success is the growth loop running: link posted, drops received, senders claim their own links, recipients
share a card, new senders arrive.

## Positioning

Unlike NGL and other anonymous inboxes, every drop can carry a clue about where it came from: a rounded
place and a photo. The guess ("someone was at the library at 3pm... who?") is the product.

## Operating Context

- Nearly all traffic arrives from Instagram and TikTok in-app browsers, on phones. Every flow is designed
  for phones first.
- Campus settings: dorms, quads, libraries, local hangouts. Many senders share one campus Wi-Fi IP.
- Sender flow: land on "Send <name> an anonymous drop", type up to 280 characters, optionally attach a
  location (current GPS or a pin on a map) and/or a photo (JPEG, PNG, WebP, up to 8 MB), send, see a
  confirmation with "Get your own drop.link".
- Recipient flow: notified (email via Resend for the MVP), open the inbox (newest first, unread state, pin
  and photo badges), open a drop (message, small interactive map of the approximate area, full photo),
  guess, tap Share to export a 9:16 story card (message, photo, place name, their link).
- Drop is one-way. Senders cannot receive private replies. Recipients answer publicly by sharing a card.

## Capabilities and Constraints

- **Stack (fixed):** React 19 + Vite, Tailwind CSS v4 with CSS-variable tokens, shadcn/ui on Radix
  primitives, Phosphor icons (shadcn components switched from Lucide). Maps: MapLibre GL JS + `pmtiles` +
  `react-map-gl/maplibre`, Protomaps PMTiles (Philippines) on R2. Backend: one Node + Hono service on
  Railway, Better Auth, Supabase (Postgres + PostGIS and photo storage) via Drizzle.
- **Recipient features:** inbox, drop detail, mark read/unread, delete, block sender (and delete), report
  (harassment, threat, sexual, self-harm, other), notifications, pause link, delete account, opt-in public
  heatmap (500 m cells, last 30 days, at least 5 drops from 3 senders per cell).
- **Location privacy shapes the UI:** every location is rounded to about a 150 m grid before storage; the
  exact point never exists server-side. Each drop shows whether its pin came from GPS or was placed by hand.
  Story cards show the place name by default, not coordinates; the map snapshot on a card is optional.
- **Anonymity:** no feature, paid or free, claims to reveal who sent a drop. A blocked sender receives the
  same success response as everyone else.
- **Moderation:** text and photos are checked before storage; a rejected drop gets a neutral message.
- **Performance:** sender page JavaScript under 150 KB gzipped; the map library loads only when the sender
  taps "attach location". Largest content within 2.5 s on 4G; TTFB under 300 ms in the Philippines.
- **Photos:** EXIF stripped, resized to at most 1080x1350, WebP under 400 KB, private and served through
  short-lived signed links.
- **Link previews:** the server writes the profile's name and avatar into OG tags, because social apps do
  not run JavaScript.
- **Layout rules (frontend.md):** four wrapper levels (section, sub-section, placement, container) on
  every page, fixed padding and gap per level defined once as tokens, no fixed widths or heights on
  wrappers, `clamp()` type, four viewport bands (below 768, 768-1279, 1280-1919, 1920+), mobile first.
- **Dev tooling (from the brief):** every visual value is a token grouped per component, tunable live in a
  Leva dev panel.
- **Undecided (PRD section 9):** sign-in methods (Google plus email one-time code proposed), web push later
  (iPhone needs add-to-home-screen), reverse-geocoding provider, moderator tooling, whether `drop.link` is
  available.

## Brand Commitments

- **Name:** Drop. Links are written `drop.link/<username>`.
- **Logo (fixed, not up for redesign):** `document/logo.jpg`. Black bubble letters "DROP" with a cool
  white sticker outline and a red map pin to the left. Sampled values: pin red `#FF3131`, letters
  `#000000`, sticker outline `#F5FDFF`.
- **Accent:** the logo's pin red is the brand accent.
- **Copy:** no em dashes in UI copy.

## Evidence on Hand

- The logo (`document/logo.jpg`, 2000x2000 JPEG).
- No real user content, testimonials, usage numbers, press or campus partners exist yet. Do not fabricate
  them; demo drops, names and photos in comps are synthetic and labelled as such.

## Product Principles

1. **The clue is the content.** Place and photo are what make a drop worth opening and worth sharing;
   surface them first, never bury them.
2. **Anonymous and honest.** Never imply the app can reveal a sender, and always say how a pin was set
   (GPS or placed by hand). Approximate places read as approximate.
3. **Sixty seconds from story tap to sent.** A sender with no account, in an in-app browser, finishes
   without friction or sign-up.
4. **Every drop is shareable.** The story card carries the recipient's link, which is how the loop grows.
5. **Safe by default for everyone.** Block, report, pause and delete are always reachable, never hidden
   behind delight.

## Accessibility & Inclusion

- Tap targets at least 44x44 px; body text at least 16 px; text contrast 4.5:1 (3:1 for large or bold
  text) in both light and dark themes.
- A `prefers-reduced-motion` fallback for every animated element.
- Light and dark themes both ship _(the brief requires both; a theme toggle is placed on all screens)_.
