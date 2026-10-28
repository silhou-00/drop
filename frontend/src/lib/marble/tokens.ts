// Marble tokens: every value that shapes the marbled bath behind the app (Combed Veins,
// as approved on the design sheet). Intensity is set per zone: content behind cards and
// lists, chrome behind headers and wide-screen margins, hero on the story card and the
// landing hero. Pigment colours are not picked: the renderer derives them from the base
// pigments below and these values. The schema sets the tweak sliders.
import type { TweakSchema } from "@/lib/tweaks/model";

export const MARBLE_VARIANTS = ["comb"] as const;
export const MARBLE_ZONES = ["content", "chrome", "hero"] as const;

export type MarbleVariant = (typeof MARBLE_VARIANTS)[number];
export type MarbleZone = (typeof MARBLE_ZONES)[number];
export type MarbleMode = "light" | "dark";

const SHARE = { min: 0, max: 1, step: 0.01 };

export const marbleDefaults = {
    variant: "comb",
    intensityContent: 0.32,
    intensityChrome: 0.5,
    intensityHero: 0.7,
    saturation: 0.55,
    pigmentContrast: 0.6,
    accentShare: 0.14,
    accentShareHero: 0.05,
    contentFade: 0.96,
    fadeLength: 160,
    lineGap: 9,
    lineWidth: 1.4,
    waveAmp: 8,
    wavePitch: 90,
    wideScale: 2.2,
};

export type MarbleTokens = typeof marbleDefaults;

export const marbleSchema: TweakSchema<MarbleTokens> = {
    variant: { options: MARBLE_VARIANTS },
    intensityContent: SHARE,
    intensityChrome: SHARE,
    intensityHero: SHARE,
    saturation: SHARE,
    pigmentContrast: SHARE,
    accentShare: { min: 0, max: 0.5, step: 0.01 },
    accentShareHero: { min: 0, max: 0.5, step: 0.01 },
    contentFade: SHARE,
    fadeLength: { min: 0, max: 400, step: 4 },
    lineGap: { min: 4, max: 30, step: 1 },
    lineWidth: { min: 0.5, max: 4, step: 0.1 },
    waveAmp: { min: 0, max: 40, step: 1 },
    wavePitch: { min: 20, max: 300, step: 2 },
    wideScale: { min: 1, max: 3, step: 0.1 },
};

// base pigments per mode, before zone intensity; ring and street are set at hero intensity
export const MARBLE_PIGMENTS = {
    light: { ground: "#EDF2F4", red: "#FF3131", grey: "#7C858B", ice: "#F5FDFF", ring: "#E36B6E", street: "#9EA8AD" },
    dark: { ground: "#0B0C0F", red: "#FF3131", grey: "#59616A", ice: "#46505A", ring: "#46505A", street: "#59616A" },
} as const satisfies Record<MarbleMode, Record<string, string>>;

// WebGL limits from the landing comp: resolution cap, idle frame rate, slow-frame fallback
export const MARBLE_GL = {
    dprCap: 1.25,
    idleFps: 30,
    slowMs: 40,
    fallbackQuality: 0.7,
} as const;
