// Story card shapes and layout. The card is a 1080 by 1920 PNG drawn on a canvas in the
// browser and never uploaded. Every size, colour and position below is taken from the approved
// Marbled Bath story comp: the logo on top, the message on a paper card, the photo in a round
// frame with ice and red rings, the place on a white pill and the link on a black pill. The
// colours are the light palette from tokens.css and the hero-intensity marble pigments, because
// the card is always light whatever the device theme is. The My link card uses a fixed line in
// place of a drop's message, inviting viewers to send one.

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

export const STORY_FILE_NAME = "drop-story.png";
export const STORY_FILE_TYPE = "image/png";
export const STORY_LOGO_PATH = "/brand/logo.svg";
export const LINK_STORY_MESSAGE = "Saw me somewhere? Send me an anonymous drop.";

// a saved download keeps its button locked this long, so a double click saves once
export const DOWNLOAD_LOCK_MS = 800;

export const STORY_COLORS = {
    ground: "#edf2f4",
    paper: "#ffffff",
    ink: "#0a0a0a",
    ink2: "#3c474d",
    accent: "#ff3131",
    ice: "#f5fdff",
    veinGrey: "#bdc5c8",
    veinPale: "#d5dcde",
    veinRed: "#d98b8c",
    shadow: "rgba(10, 10, 10, 0.14)",
};

// the brand families, then the system emoji fonts for anything the brand fonts lack
export const STORY_FONTS = {
    display: '"Unbounded"',
    body: '"Onest"',
    meta: '"Azeret Mono"',
    fallback: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif',
};

// the font faces the card draws with, loaded before the first stroke
export const STORY_FONT_FACES = [
    '500 52px "Onest"',
    '500 26px "Onest"',
    '700 40px "Unbounded"',
    '700 38px "Azeret Mono"',
];

export const STORY_LAYOUT = {
    logoTop: 262,
    logoWidth: 360,
    logoRatio: 876 / 1695,
    paperInset: 90,
    paperTop: 500,
    paperPaddingBlock: 48,
    paperPaddingInline: 54,
    paperRadius: 40,
    paperShadowBlur: 48,
    paperShadowY: 24,
    messageMaxSize: 52,
    messageMinSize: 30,
    messageLineHeight: 1.24,
    photoMaxSize: 420,
    photoMinSize: 220,
    photoRings: [52, 44, 30, 16],
    photoGap: 18,
    placeTop: 1340,
    placePaddingBlock: 22,
    placePaddingInline: 40,
    placeGap: 14,
    placeMaxSize: 40,
    placeMinSize: 26,
    placeSourceSize: 26,
    linkBottom: 390,
    linkPaddingBlock: 18,
    linkPaddingInline: 38,
    linkMaxSize: 38,
    linkMinSize: 24,
    pillMaxWidth: 900,
    veinGap: 24,
    veinWidth: 2.2,
    veinAmplitude: 20,
    veinPitch: 260,
};

// the Phosphor map pin, fill weight, on its 256 unit grid
export const PIN_PATH =
    "M128,16a88.1,88.1,0,0,0-88,88c0,75.3,80,132.17,83.41,134.55a8,8,0,0,0,9.18,0C136,236.17,216,179.3,216,104A88.1,88.1,0,0,0,128,16Zm0,56a32,32,0,1,1-32,32A32,32,0,0,1,128,72Z";
export const PIN_GRID = 256;

// every drop's place comes from GPS, so the pill's source label is fixed
export const PLACE_SOURCE_LABEL = "GPS";

export type StoryOptions = { includePhoto: boolean; includePlace: boolean };

export type StoryInput = {
    message: string;
    placeName: string | null;
    photo: HTMLImageElement | ImageBitmap | null;
    link: string;
};
