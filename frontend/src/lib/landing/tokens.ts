// Landing tokens: every value that shapes the landing's scroll story. The motion values come
// from the shared landing motion tokens; this file adds the hero load timing, the plate beats
// (the map window, the dive with its peeled note, the lens: camera zoom, comb, slide-off exits
// and the sender scramble), the street map, the calm boxes that keep copy readable, the stage
// spans of the answer thread, the step spans of the pinned sections and the red share of the marble.
// The dev tweak panel only edits flat groups of plain values, so the tokens are flattened into
// one group per key (paths joined with "_", list items by index) and rebuilt after editing.
import { landingMotion } from "@/lib/motion/tokens";
import type { TweakGroup, TweakValues } from "@/lib/tweaks/model";

export const landingDefaults = {
    ...landingMotion,
    // hero load: lines rise, the drop falls, the ink spreads from the impact (seconds for inkDur)
    load: { riseAt: 60, dropAt: 260, fall: 700, impactFrac: 0.364, inkDur: 0.95 },
    // hero exit: lines lift out over this share of the hero pin, by this share of a screen
    exit: { from: 0.25, lift: 0.18, stagger: 0.12 },
    // headings split and slide off while their frame leaves
    split: { dist: 0.55, span: 0.45, lead: 0.25 },
    // camera zoom per plate beat: the map window, the dive into the pin, the lens
    zoom: { tall: { b2: 1.3, b3: 2.3, b4: 3.2 }, wide: { b2: 1.3, b3: 2.4, b4: 3.4 } },
    // the lens beat keeps this much of the combed street map
    comb: { b4: 0.4 },
    // the note cut out of the bath and lifted off it during the dive
    card: { peelDeg: 56, cut: [0, 0.28], lift: [0.28, 0.88], shrink: 0.08 },
    // the sender scramble: glyph tick, then place and time lock left to right
    scramble: { tick: 40, lockDelay: 120, lockDur: 640 },
    // combed street map: cross street jitter, bend and row wobble, in line gaps
    streets: { jit: 2.5, bend: 2.2, wobble: 0.9 },
    // calm boxes around copy, in px: padding outside the copy and the soft edge
    calm: { pad: 20, feather: 48 },
    // shares of the answer pin where each thread stage ends: grow, note, typing, posted, incoming
    answer: { grow: 0.15, note: 0.35, typed: 0.6, posted: 0.75, end: 0.95 },
    // shares of the section pin: redaction steps run from a to b, the closing from c to d
    redaction: { a: 0.04, b: 0.78, c: 0.8, d: 0.96 },
    // the claim arrives from depth (starting scale) over this share of a screen before its top
    claim: { arrive: 0.7, depth: 0.82 },
    // the marble's red share, the same from the hero to the footer
    bath: { accent: 0.13 },
} as const;

export type LandingTokens = typeof landingDefaults;

type Nested = number | readonly Nested[] | { readonly [key: string]: Nested };

const SEPARATOR = "_";

function entriesOf(value: Exclude<Nested, number>): [string, Nested][] {
    if (Array.isArray(value)) {
        return value.map((child, i) => [String(i), child]);
    }

    return Object.entries(value);
}

function joinPath(path: string, key: string) {
    return path ? `${path}${SEPARATOR}${key}` : key;
}

function flattenInto(value: Nested, path: string, group: TweakGroup) {
    if (typeof value === "number") {
        group[path] = value;

        return;
    }

    for (const [key, child] of entriesOf(value)) {
        flattenInto(child, joinPath(path, key), group);
    }
}

function rebuild(value: Nested, path: string, group: TweakGroup): Nested {
    if (typeof value === "number") {
        const edited = group[path];

        return typeof edited === "number" ? edited : value;
    }

    if (Array.isArray(value)) {
        return value.map((child, i) => rebuild(child, joinPath(path, String(i)), group));
    }

    return Object.fromEntries(
        entriesOf(value).map(([key, child]) => [key, rebuild(child, joinPath(path, key), group)]),
    );
}

// one flat tweak group per top-level key
export function flattenLandingTokens(tokens: LandingTokens): TweakValues {
    const flat: TweakValues = {};

    for (const [key, value] of Object.entries(tokens)) {
        const group: TweakGroup = {};

        flattenInto(value as Nested, "", group);
        flat[key] = group;
    }

    return flat;
}

// the token shape again, with edited values where the panel has them
export function unflattenLandingTokens(flat: TweakValues): LandingTokens {
    const tokens: Record<string, Nested> = {};

    for (const [key, value] of Object.entries(landingDefaults)) {
        const group = flat[key];

        tokens[key] = typeof group === "object" ? rebuild(value as Nested, "", group) : (value as Nested);
    }

    return tokens as unknown as LandingTokens;
}

export const landingFlatDefaults = flattenLandingTokens(landingDefaults);
