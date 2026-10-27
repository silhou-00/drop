// ASCII logo tokens. The grid group sets the cell size and the characters used to
// draw the logo, the colours group paints each kind of cell, the melt group tunes how
// cells drip away from the pointer and spring home, and the idle group sets the gentle
// wobble shown when nobody is touching it. The pin colour was sampled from the logo.
import type { TweakSchema } from "@/lib/tweaks/model";

export const asciiLogoDefaults = {
    grid: {
        cellSize: 10,
        densityRamp: ":;t%SX8#@",
        edgeChars: ".',`",
        fontWeight: 600,
        outlineThreshold: 4,
    },
    colors: {
        letters: "#0b0b0d",
        pin: "#ff3131",
        outline: "#9ec3d6",
        background: "#ffffff",
    },
    melt: {
        pointerRadius: 90,
        meltStrength: 1,
        gravity: 900,
        drag: 4,
        springBack: 60,
        dripLength: 60,
        rippleStrength: 260,
        rippleSpeed: 520,
    },
    idle: {
        wobbleAmount: 1.5,
        wobbleSpeed: 1.2,
    },
};

export type AsciiLogoTokens = typeof asciiLogoDefaults;

export const asciiLogoSchema: TweakSchema<AsciiLogoTokens> = {
    grid: {
        cellSize: { min: 5, max: 24, step: 1 },
        fontWeight: { min: 100, max: 900, step: 100 },
        outlineThreshold: { min: 0, max: 30, step: 1 },
    },
    melt: {
        pointerRadius: { min: 0, max: 300, step: 1 },
        meltStrength: { min: 0, max: 3, step: 0.05 },
        gravity: { min: 0, max: 3000, step: 10 },
        drag: { min: 0, max: 20, step: 0.1 },
        springBack: { min: 1, max: 300, step: 1 },
        dripLength: { min: 0, max: 200, step: 1 },
        rippleStrength: { min: 0, max: 1000, step: 5 },
        rippleSpeed: { min: 50, max: 2000, step: 10 },
    },
    idle: {
        wobbleAmount: { min: 0, max: 6, step: 0.1 },
        wobbleSpeed: { min: 0, max: 5, step: 0.05 },
    },
};
