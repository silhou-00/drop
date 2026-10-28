// Scrollbar tokens: every value that shapes the page scrollbar (option A, "Hairline", as
// approved on the scrollbar sheet) and the thin bar used on scrolling areas inside the app.
// Shared values place the bar and set its inks for light and dark grounds; the hairline group
// sizes the thumb; the area group styles inner scroll areas. The schema sets the tweak sliders.
import type { TweakSchema } from "@/lib/tweaks/model";

export const scrollbarDefaults = {
    shared: {
        edge: 6,
        hit: 18,
        hideDelay: 1200,
        fadeIn: 140,
        fadeOut: 320,
        inkLight: "#3C474D",
        inkDark: "#B4BEC3",
        trackLight: "rgba(10,10,10,.10)",
        trackDark: "rgba(245,253,255,.16)",
        zIndex: 7,
    },
    hairline: {
        width: 10,
        idleScale: 0.4,
        minThumb: 44,
        radius: 999,
    },
    area: {
        width: 10,
        inkLight: "rgba(60,71,77,.55)",
        inkLightHover: "#3C474D",
        inkDark: "rgba(180,190,195,.5)",
        inkDarkHover: "#B4BEC3",
    },
};

export type ScrollbarTokens = typeof scrollbarDefaults;

export const scrollbarSchema: TweakSchema<ScrollbarTokens> = {
    shared: {
        edge: { min: 0, max: 24, step: 1 },
        hit: { min: 8, max: 40, step: 1 },
        hideDelay: { min: 200, max: 4000, step: 50 },
        fadeIn: { min: 0, max: 600, step: 10 },
        fadeOut: { min: 0, max: 1000, step: 10 },
        zIndex: { min: 1, max: 30, step: 1 },
    },
    hairline: {
        width: { min: 2, max: 16, step: 1 },
        idleScale: { min: 0.1, max: 1, step: 0.05 },
        minThumb: { min: 20, max: 120, step: 2 },
        radius: { min: 0, max: 999, step: 1 },
    },
    area: {
        width: { min: 4, max: 16, step: 1 },
    },
};

// the stylesheet variables each token writes, with its unit
export function scrollbarCssVars(tokens: ScrollbarTokens): Record<string, string> {
    const { shared, hairline } = tokens;

    return {
        "--sb-edge": `${shared.edge}px`,
        "--sb-hit": `${shared.hit}px`,
        "--sb-fade-in": `${shared.fadeIn}ms`,
        "--sb-fade-out": `${shared.fadeOut}ms`,
        "--sb-ink-l": shared.inkLight,
        "--sb-ink-d": shared.inkDark,
        "--sb-track-l": shared.trackLight,
        "--sb-track-d": shared.trackDark,
        "--sb-z": String(shared.zIndex),
        "--hl-w": `${hairline.width}px`,
        "--hl-idle": String(hairline.idleScale),
        "--hl-radius": `${hairline.radius}px`,
    };
}

// inner scroll areas read these from the document root
export function scrollAreaCssVars(tokens: ScrollbarTokens): Record<string, string> {
    const { area } = tokens;

    return {
        "--area-w": `${area.width}px`,
        "--area-ink-l": area.inkLight,
        "--area-ink-l-hover": area.inkLightHover,
        "--area-ink-d": area.inkDark,
        "--area-ink-d-hover": area.inkDarkHover,
    };
}
