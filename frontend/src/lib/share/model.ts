// Story card shapes and layout. The card is a 1080 by 1920 PNG drawn on a canvas in the
// browser and never uploaded. Every size, colour and position below is taken from the approved
// Marbled Bath story comp: the logo on top, the message on a paper card, the photo in a round
// frame with ice and red rings, and the place on a white pill. The foot is left clear for the
// owner's own Link sticker; the card never prints the address itself. The colours are the light
// palette from tokens.css and the hero-intensity marble pigments, whatever the device theme is.
// The owner can restyle the card from fixed lists only: background, card colour, font, text
// size and alignment. The default style is the approved comp. The My link card uses the
// statement's text in place of a drop's message.

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

export const STORY_FILE_NAME = "drop-story.png";
export const STORY_FILE_TYPE = "image/png";
export const STORY_LOGO_PATH = "/brand/logo.svg";
export const STORY_LOGO_DARK_PATH = "/brand/logo-dark.svg";
export const STORY_LOGO_WHITE_PATH = "/brand/logo-white.svg";

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
    fallback: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif',
};

// the font faces the card draws with, loaded before the first stroke
export const STORY_FONT_FACES = [
    '500 52px "Onest"',
    '500 26px "Onest"',
    '700 40px "Unbounded"',
    '500 52px "Azeret Mono"',
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
    paperEdgeWidth: 2,
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
    pillMaxWidth: 900,
    pillShadowBlur: 28,
    pillShadowY: 10,
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

export type StoryBackground = "marble" | "red-marble" | "ink" | "ice" | "red";
export type StoryCardColor = "white" | "black" | "red" | "ice";
export type StoryTypeface = "clean" | "bold" | "typewriter";
export type StoryTextSize = "small" | "medium" | "large";
export type StoryAlign = "left" | "center";

export type StoryStyle = {
    background: StoryBackground;
    card: StoryCardColor;
    font: StoryTypeface;
    size: StoryTextSize;
    align: StoryAlign;
};

// a ground with its three vein colours, the photo ring colours and the pill's shadow
export type StoryBackgroundSpec = {
    id: StoryBackground;
    label: string;
    ground: string;
    veinGrey: string;
    veinPale: string;
    veinRed: string;
    ringOuter: string;
    ringAccent: string;
    pillShadow: string | null;
    logo: string;
    cardEdge: string | null;
    swatch: string;
    swatchVein: string;
};

export type StoryCardSpec = { id: StoryCardColor; label: string; fill: string; ink: string; swatch: string };

export type StoryTypefaceSpec = { id: StoryTypeface; label: string; family: string; weight: number };

export type StoryTextSizeSpec = { id: StoryTextSize; label: string; maxSize: number };

export type StoryAlignSpec = { id: StoryAlign; label: string };

const PILL_SHADOW = "rgba(10, 10, 10, 0.16)";

export const STORY_BACKGROUNDS: readonly StoryBackgroundSpec[] = [
    {
        id: "marble",
        label: "Marble",
        ground: STORY_COLORS.ground,
        veinGrey: STORY_COLORS.veinGrey,
        veinPale: STORY_COLORS.veinPale,
        veinRed: STORY_COLORS.veinRed,
        ringOuter: STORY_COLORS.veinGrey,
        ringAccent: STORY_COLORS.veinRed,
        pillShadow: null,
        logo: STORY_LOGO_PATH,
        cardEdge: null,
        swatch: STORY_COLORS.ground,
        swatchVein: STORY_COLORS.veinGrey,
    },
    {
        id: "red-marble",
        label: "Red marble",
        ground: "#f8eeee",
        veinGrey: "#e3a5a7",
        veinPale: "#efcfd0",
        veinRed: "#d9474c",
        ringOuter: "#e3a5a7",
        ringAccent: STORY_COLORS.accent,
        pillShadow: null,
        logo: STORY_LOGO_PATH,
        cardEdge: null,
        swatch: "#f8eeee",
        swatchVein: "#d9474c",
    },
    {
        id: "ink",
        label: "Ink",
        ground: "#16181c",
        veinGrey: "#3a4046",
        veinPale: "#272b30",
        veinRed: "#4a5056",
        ringOuter: "#3a4046",
        ringAccent: STORY_COLORS.accent,
        pillShadow: null,
        logo: STORY_LOGO_DARK_PATH,
        cardEdge: "rgba(245, 253, 255, 0.22)",
        swatch: "#16181c",
        swatchVein: "#4a5056",
    },
    {
        id: "ice",
        label: "Ice",
        ground: STORY_COLORS.ice,
        veinGrey: "#dde7eb",
        veinPale: "#e9f2f5",
        veinRed: "#f0d6d7",
        ringOuter: STORY_COLORS.veinGrey,
        ringAccent: STORY_COLORS.veinRed,
        pillShadow: PILL_SHADOW,
        logo: STORY_LOGO_PATH,
        cardEdge: null,
        swatch: STORY_COLORS.ice,
        swatchVein: "#dde7eb",
    },
    {
        id: "red",
        label: "Red",
        ground: STORY_COLORS.accent,
        veinGrey: "#e2242a",
        veinPale: "#f0292f",
        veinRed: "#c2121f",
        ringOuter: "#b3001b",
        ringAccent: STORY_COLORS.accent,
        pillShadow: PILL_SHADOW,
        logo: STORY_LOGO_WHITE_PATH,
        cardEdge: null,
        swatch: STORY_COLORS.accent,
        swatchVein: "#c2121f",
    },
];

// the text colour on each card is picked for contrast: ink on light, ice on dark
export const STORY_CARD_COLORS: readonly StoryCardSpec[] = [
    { id: "white", label: "White", fill: STORY_COLORS.paper, ink: STORY_COLORS.ink, swatch: STORY_COLORS.paper },
    { id: "black", label: "Black", fill: STORY_COLORS.ink, ink: STORY_COLORS.ice, swatch: STORY_COLORS.ink },
    { id: "red", label: "Red", fill: "#b3001b", ink: STORY_COLORS.ice, swatch: "#b3001b" },
    { id: "ice", label: "Ice", fill: STORY_COLORS.ice, ink: STORY_COLORS.ink, swatch: STORY_COLORS.ice },
];

export const STORY_TYPEFACES: readonly StoryTypefaceSpec[] = [
    { id: "clean", label: "Clean", family: STORY_FONTS.body, weight: 500 },
    { id: "bold", label: "Bold", family: STORY_FONTS.display, weight: 700 },
    { id: "typewriter", label: "Typewriter", family: '"Azeret Mono"', weight: 500 },
];

// the largest message size; long text still shrinks down to messageMinSize
export const STORY_TEXT_SIZES: readonly StoryTextSizeSpec[] = [
    { id: "small", label: "Small", maxSize: 40 },
    { id: "medium", label: "Medium", maxSize: 52 },
    { id: "large", label: "Large", maxSize: 68 },
];

export const STORY_ALIGNS: readonly StoryAlignSpec[] = [
    { id: "left", label: "Left" },
    { id: "center", label: "Centre" },
];

export const DEFAULT_STORY_STYLE: StoryStyle = {
    background: "marble",
    card: "white",
    font: "clean",
    size: "medium",
    align: "left",
};

export type StoryOptions = { includePhoto: boolean; includePlace: boolean; style: StoryStyle };

export type StoryInput = {
    message: string;
    placeName: string | null;
    photo: HTMLImageElement | ImageBitmap | null;
};
