// Landing tokens: every value that shapes the landing's scroll story. The motion values come
// from the shared landing motion tokens unchanged; this file adds the few the comp keeps beside
// them (hero load timing, the peeled note, the street map, the shader's red share).
// The dev tweak panel only edits flat groups of plain values, so the tokens are flattened into
// one group per key (paths joined with "_", list items by index) and rebuilt after editing.
import { landingMotion } from "@/lib/motion/tokens";
import type { TweakGroup, TweakValues } from "@/lib/tweaks/model";

export const landingDefaults = {
    ...landingMotion,
    // hero load: lines rise, the drop falls, the ink spreads from the impact (seconds for inkDur)
    load: { riseAt: 60, dropAt: 260, fall: 700, impactFrac: 0.364, inkDur: 0.95 },
    // the note cut out of the bath and lifted off it during beat 03
    card: { peelDeg: 56, cut: [0, 0.28], lift: [0.28, 0.88], shrink: 0.08 },
    // combed street map: cross street jitter, bend and row wobble, in line gaps
    streets: { jit: 2.5, bend: 2.2, wobble: 0.9 },
    // share of veins the ink turns red
    shader: { accent: 0.13 },
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
