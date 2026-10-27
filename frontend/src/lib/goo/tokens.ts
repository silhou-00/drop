// Goo filter tokens. The filter blurs shapes together, then sharpens the blurred
// alpha back into a hard edge: blur sets how far shapes reach for each other, the
// alpha contrast how hard the edge becomes, and the alpha offset where it cuts.
import type { TweakSchema } from "@/lib/tweaks/model";

export const gooDefaults = {
    blur: 10,
    alphaContrast: 20,
    alphaOffset: -9,
};

export type GooTokens = typeof gooDefaults;

export const gooSchema: TweakSchema<GooTokens> = {
    blur: { min: 0, max: 40, step: 0.5 },
    alphaContrast: { min: 1, max: 60, step: 0.5 },
    alphaOffset: { min: -30, max: 0, step: 0.5 },
};
