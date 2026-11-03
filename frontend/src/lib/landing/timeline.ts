// Landing timeline: turns one scroll position into everything the page shows at that point.
// Every span comes from the measured sections. The pinned sections pin their frame for their
// own height less one screen, and their progress runs 0 to 1 through that pin. The three plate
// beats after the hero (the map window, the dive, the lens) pin each plate keyframe to a
// document position instead: between two stops the plate is eased from one keyframe to the
// next, and once the lens has played the plate opens back to the full screen. Everywhere else
// the plate is the full screen and the marble keeps one look, so the scroll only moves the calm
// boxes behind the copy. Those boxes are measured once per layout and only offset by the scroll
// here, so a frame never reads the page. Under reduced motion the pinned sections do not pin,
// and every plate transition snaps to its end.
import { referenceFrame, type MarbleBox, type MarbleFrame } from "@/lib/marble/renderer";
import { marbleDefaults } from "@/lib/marble/tokens";
import {
    clamp,
    easeIn,
    easeIO,
    findRedPin,
    keyframes,
    mixPlates,
    pickPins,
    streetMap,
    type Keyframes,
    type Plate,
    type Point,
    type RedPin,
    type ScenePin,
} from "./scenes";
import type { LandingTokens } from "./tokens";

export const SECTION_IDS = ["top", "b2", "b3", "b4", "statement", "answer", "redaction", "claim-band"] as const;

const ANSWER = 5;
const REDACTION = 6;
const CLAIM = 7;
const CALM_SLOTS = 2;
const WIDE_MIN = 1024;
const WIDE_ASPECT = 1.05;

// a copy block the marble stays calm under: x, size, offset in its frame, and its pin span
export type CalmEntry = { x: number; w: number; h: number; off: number; a: number; b: number };
export type SectionMeasure = { top: number; h: number };

export type LandingMeasure = {
    width: number;
    height: number;
    sections: SectionMeasure[];
    calm: CalmEntry[];
};

export type Span = { top: number; pin: number };

type Stop = { at: number; plate: Plate; ease?: (t: number) => number };

export type LandingLayout = {
    W: number;
    H: number;
    wide: boolean;
    frame: MarbleFrame;
    red: RedPin;
    baseS: Point;
    note: Point;
    K: Keyframes;
    card3: Point;
    pins: ScenePin[];
    top: number[];
    stops: Stop[];
    spans: Span[];
    calm: CalmEntry[];
};

export type RedactionState = { step: number; t: number[]; close: number };
export type AnswerState = {
    step: number;
    grow: number;
    note: number;
    typed: number;
    posted: number;
    incoming: number[];
};

export type ScrollState = {
    y: number;
    p: number[];
    plate: Plate;
    dive: number;
    h3: number;
    lens: number;
    h4: number;
    frame: number;
    answer: AnswerState;
    redaction: RedactionState;
    arrive: number;
    boxes: MarbleBox[];
    boxKey: string;
};

export type Ground = "paper" | "dark";

// the plate timeline: full screen, map window, dive, lens, then full screen again
function buildStops(H: number, K: Keyframes, top: number[]) {
    const [t2, t3, t4, t5] = top;
    const list: Stop[] = [
        { at: t2 - 0.96 * H, plate: K.hero },
        { at: t2, plate: K.b2, ease: easeIO },
        { at: t3 - H, plate: K.b2 },
        { at: t3, plate: K.b3, ease: easeIO },
        { at: t4 - H, plate: K.b3 },
        { at: t4, plate: K.b4, ease: easeIO },
        { at: t5 - H, plate: K.b4 },
        { at: t5, plate: K.hero, ease: easeIO },
    ];

    for (let i = 1; i < list.length; i++) {
        list[i].at = Math.max(list[i].at, list[i - 1].at + 1);
    }

    return list;
}

// everything that changes only when the page is laid out again
export function buildLayout(m: LandingMeasure, tokens: LandingTokens): LandingLayout {
    const W = m.width;
    const H = m.height;
    const wide = W >= WIDE_MIN && W / H > WIDE_ASPECT;
    const frame = referenceFrame(W, H, marbleDefaults);
    const map = streetMap(frame, tokens);
    const red = findRedPin(map, frame);
    const baseS: Point = [(red.q[0] - frame.crop[0]) * frame.cover, (red.q[1] - frame.crop[1]) * frame.cover];
    const noteW = wide ? clamp(0.24 * W, 280, 380) : Math.min(0.8 * W, 320);
    const shape = keyframes(W, H, wide, baseS, tokens);
    const top = m.sections.slice(1, 5).map((s) => s.top);

    return {
        W,
        H,
        wide,
        frame,
        red,
        baseS,
        note: [noteW, Math.round(noteW * 0.74)],
        K: shape.K,
        card3: shape.card3,
        pins: pickPins(map, red, shape.K.b2, frame.cover),
        top,
        stops: buildStops(H, shape.K, top),
        spans: m.sections.map((s) => ({ top: s.top, pin: Math.max(1, s.h - H) })),
        calm: m.calm,
    };
}

// the plate at a scroll position; reduced motion jumps halfway
function plateAt(y: number, stops: Stop[], reduced: boolean) {
    if (y <= stops[0].at) {
        return stops[0].plate;
    }

    for (let i = 0; i < stops.length - 1; i++) {
        const next = stops[i + 1];

        if (y < next.at) {
            let t = (y - stops[i].at) / (next.at - stops[i].at);

            if (reduced) {
                t = t >= 0.5 ? 1 : 0;
            } else if (next.ease) {
                t = next.ease(t);
            }

            return mixPlates(stops[i].plate, next.plate, t);
        }
    }

    return stops[stops.length - 1].plate;
}

// the four redaction steps and the closing, as a pure function of the section progress
export function redactionAt(p: number, tokens: LandingTokens): RedactionState {
    const { a, b, c, d } = tokens.redaction;
    const f = clamp((p - a) / (b - a)) * 4;

    return {
        step: Math.max(0, Math.min(3, Math.floor(f - 0.5))),
        t: [0, 1, 2, 3].map((k) => clamp(f - k)),
        close: clamp((p - c) / (d - c)),
    };
}

// the reply thread's stages, as a pure function of the section progress
export function answerAt(p: number, tokens: LandingTokens): AnswerState {
    const { grow, note, typed, posted, end } = tokens.answer;
    const tail = clamp((p - posted) / (end - posted)) * 3;
    let step = 0;

    if (p >= posted) {
        step = 3;
    } else if (p >= typed) {
        step = 2;
    } else if (p >= note) {
        step = 1;
    }

    return {
        step,
        grow: clamp(p / grow),
        note: clamp((p - grow) / (note - grow)),
        typed: clamp((p - note) / (typed - note)),
        posted: clamp((p - typed) / (posted - typed)),
        incoming: [0, 1, 2].map((k) => clamp(tail - k)),
    };
}

// the two most visible copy blocks, padded, in viewport px
function calmBoxesAt(y: number, L: LandingLayout, tokens: LandingTokens): MarbleBox[] {
    const pad = tokens.calm.pad;
    const seen: { box: MarbleBox; area: number }[] = [];

    for (const e of L.calm) {
        const top = e.off + clamp(y, e.a, e.b) - y;
        const area = Math.max(0, Math.min(top + e.h, L.H) - Math.max(top, 0)) * e.w;

        if (area > 0) {
            seen.push({ box: [e.x - pad, top - pad, e.w + 2 * pad, e.h + 2 * pad], area });
        }
    }

    seen.sort((m, n) => n.area - m.area);

    return seen.slice(0, CALM_SLOTS).map((s) => s.box);
}

export function readScroll(y: number, L: LandingLayout, tokens: LandingTokens, reduced: boolean): ScrollState {
    const H = L.H;
    const [, t3, t4, t5] = L.top;
    const snap = (t: number) => (reduced ? (t < 0.5 ? 0 : 1) : t);
    const p = L.spans.map((s) => clamp((y - s.top) / s.pin));
    const lead = tokens.claim.arrive * H;
    const boxes = calmBoxesAt(y, L, tokens);

    return {
        y,
        p,
        plate: plateAt(y, L.stops, reduced),
        dive: snap(clamp((y - (t3 - H)) / H)),
        h3: snap(clamp((y - t3) / Math.max(1, t4 - H - t3))),
        lens: snap(clamp((y - (t4 - H)) / H)),
        h4: clamp((y - t4) / Math.max(1, t5 - H - t4)),
        frame: snap(clamp((y - (t5 - H)) / H)),
        answer: answerAt(p[ANSWER], tokens),
        redaction: redactionAt(p[REDACTION], tokens),
        arrive: clamp((y - (L.spans[CLAIM].top - lead)) / lead),
        boxes,
        boxKey: boxes.map((b) => b.map((v) => v.toFixed(1)).join(",")).join("|"),
    };
}

// exit groups: the map window, the dive and the lens copy; each slides off while its frame leaves
export function exitSpans(L: LandingLayout, tokens: LandingTokens): Point[] {
    const H = L.H;
    const [, t3, t4, t5] = L.top;
    const x = tokens.split.span * H;
    const a0 = (t: number) => t - H - tokens.split.lead * H;

    return [
        [t3 - H, t3 - H + x],
        [a0(t4), a0(t4) + x],
        [a0(t5), a0(t5) + x],
    ];
}

// one element's slide in px, alternating sides
export function exitOffset(group: number, index: number, y: number, L: LandingLayout, tokens: LandingTokens) {
    const [a, b] = exitSpans(L, tokens)[group];
    const e = easeIn(clamp((y - a) / (b - a)));
    const side = index % 2 ? 1 : -1;

    return side * tokens.split.dist * e * L.W;
}

// the colour under the plate: paper for the map window, dark from the dive through the lens
export function groundAt(y: number, L: LandingLayout): Ground {
    const [, t3, , t5] = L.top;

    if (y < t3 + 0.3 * L.H || y >= t5) {
        return "paper";
    }

    return "dark";
}
