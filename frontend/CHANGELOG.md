# Frontend Changelog

## October 31, 2026

**App shell:**

- The Map page shows every drop as a pin on a map, with filters and a list of the drops at each place.
- The My link page shows the owner's link with a story image to share, and Settings has an appearance choice (light, dark or automatic) and sign out.
- The chosen look is applied before the page appears, so it no longer flashes.
- Pages open faster when a link is hovered or touched, and pages load lighter.
- Signed-in pages share a new frame with a tab bar or side rail, an unread badge, inbox filters, a side-by-side reading view on wide screens, and a restyled drop page.

## October 30, 2026

**Sharing:**

- Drop owners can turn a drop into a story image, with or without the photo and place, and share or save it.

**Inbox:**

- People who have claimed a link now land on an inbox that lists their drops, newest first, with unread dots and a Load more button. Opening a drop shows its message, place and a small map, marks it read, and keeps the photo blurred until tapped. Drops can be marked unread or deleted after a confirm, and the old home address forwards to the inbox.

**Photos:**

- Senders can add one photo to a drop from their camera or gallery, see a preview with its size, and remove it before sending. A wrong or oversized file is turned away with a plain message.

**Send page:**

- Senders now share their GPS location to send a drop; placing a pin by hand is gone.
- Anyone can open a person's link and send them an anonymous drop with a message and an optional place, taken from their phone location or a pin placed on a map. A confirmation follows, with a way to send another or claim their own link.
- Links that do not exist, fail to load or are paused each get a plain page, and the map loads only when a sender asks for it.

**Profiles:**

- Claiming a link no longer asks for an age confirmation.

**Landing:**

- The page now says Drop is accessible by all, and describes places as coming from the sender's GPS location.

## October 29, 2026

**Landing:**

- The developer tweak panel and the screen-size badge are removed for good, along with the slider library behind them.
- The landing is quieter: the beat counter pill, the hero's coordinates, place chip, distance tag and age line are gone, and "Sign in" in the nav and footer now opens the sign-in page. The developer tweak panel is hidden.

**Auth and profiles:**

- People can sign in with an emailed six-digit code, claim their link with a live name check and the 18 or older confirmation, and see and copy their link on a simple home page. The landing's claim step now takes a free name on to sign-in instead of saying sign-up opens soon.

**Landing:**

- Visitors get the Drop landing page: a seven-step scroll story over one live marbled background, smooth wheel scrolling, a thin matching scrollbar for mouse users, a claim step that checks the chosen name and says sign-up opens soon, and a calm still version for reduced motion or missing graphics.

## October 28, 2026

**Design system:**

- The app takes on the approved Drop look: its light and dark colours, three typefaces, text sizes, spacing per screen size, the new movement set, and a slowly drifting marbled background with a still picture for reduced motion. The text-art logo is replaced by the vector logo.

## October 27, 2026

**Design foundation:**

- Developers can tune every visual value live in the browser and copy the result, and the app gains its motion set, a gooey shape effect, an animated text-art logo, and shared spacing and text sizes. None of the tuning tools ship to visitors.

**Project scaffold:**

- The web app builds with its styling, component, icon, and page-routing foundations, and shows a placeholder home page.
