// Landing timeline: turns one scroll position into the progress of every beat. The section
// heights, measured from the page, pin each plate keyframe to a document position; between two
// stops the plate is eased from one keyframe to the next. Beats 06 and 07 get their own clock:
// the five facts step through the pinned frame, then the bath floods back, the claim is
// revealed and the bath lifts away. Under reduced motion every transition snaps to its end.
import { referenceFrame, type MarbleFrame } from "@/lib/marble/renderer";
import { marbleDefaults } from "@/lib/marble/tokens";
import {
    clamp,
    easeIn,
    easeIO,
    findRedPin,
    keyframes,
    mixPlates,
    pickPins,
    smoothstep,
    streetMap,
    type Keyframes,
    type Plate,
    type Point,
    type RedPin,
    type ScenePin,
} from "./scenes";
import type { LandingTokens } from "./tokens";

// what the page reports: viewport, gutter, beat tops (02 to 06), 06's height, page height
export type LandingMeasure = {
    width: number;
    height: number;
    gutter: number;
    tops: number[];
    b6Height: number;
    scrollHeight: number;
};

type Ease = (t: number) => number;
type Stop = { at: number; plate: Plate; ease?: Ease; track?: boolean };

export type ClaimTimes = { hs: number; step: number; F0: number; F1: number; rev: number; l0: number; mid: number };

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
    story: Point;
    storyK: number;
    kqTop: number | null;
    pins: ScenePin[];
    top: number[];
    maxY: number;
    c: ClaimTimes;
    stops: Stop[];
    trackLen: number;
    dist: number;
    panelX: number[];
};

export type ScrollState = {
    y: number;
    plate: Plate;
    hero: number;
    dive: number;
    h3: number;
    lens: number;
    h4: number;
    frame: number;
    trk: number;
    g: number;
    kq: number;
    kqU: number;
    p7: number;
    prog: number;
};

const BEAT_NAMES = [
    "Drop",
    "Leave it somewhere",
    "Someone finds it",
    "Guess who",
    "Answer in your story",
    "Kept quiet",
    "Claim",
];
const WIDE_MIN = 1024;
const WIDE_ASPECT = 1.05;

// 06 and 07 timing: facts step through the pinned frame, then flood, reveal and lift
function claimTimes(m: LandingMeasure, tokens: LandingTokens): ClaimTimes {
    const H = m.height;
    const t6 = m.tops[4];
    const F1 = t6 + m.b6Height - H;
    const F0 = F1 - tokens.kq.flood * H;
    const hs = t6 + tokens.kq.start * H;

    return {
        hs,
        step: Math.max(1, (F0 - hs) / 5),
        F0,
        F1,
        rev: F0 + tokens.kq.reveal * H,
        l0: F1 + tokens.kq.liftAt * H,
        mid: (F0 + F1) / 2,
    };
}

// the 05 track eases in two halves, holding each panel for a moment
export function trackEase(t: number, tokens: LandingTokens) {
    const u = t * 2;
    const i = Math.min(1, Math.floor(u));
    const f = u - i;

    return (i + smoothstep(tokens.track.hold, 1 - tokens.track.hold, f)) / 2;
}

// the scroll timeline: plate keyframes pinned to document positions
function buildStops(H: number, K: Keyframes, top: number[], c: ClaimTimes, trackLen: number, tokens: LandingTokens) {
    const [t2, t3, t4, t5, t6] = top;
    const list: Stop[] = [
        { at: 0.04 * H, plate: K.hero },
        { at: t2, plate: K.b2, ease: easeIO },
        { at: t3 - H, plate: K.b2 },
        { at: t3, plate: K.b3, ease: easeIO },
        { at: t4 - H, plate: K.b3 },
        { at: t4, plate: K.b4, ease: easeIO },
        { at: t5 - H, plate: K.b4 },
        { at: t5, plate: K.b5a, ease: easeIO },
        { at: t5 + trackLen, plate: K.b5b, ease: (t) => trackEase(t, tokens), track: true },
        { at: t6, plate: K.b5b },
        { at: t6 + 1, plate: K.b6a },
        { at: t6 + 0.45 * H, plate: K.f[0], ease: easeIO },
    ];

    for (let k = 1; k < 5; k++) {
        list.push({ at: c.hs + (k - tokens.kq.move) * c.step, plate: K.f[k - 1] });
        list.push({ at: c.hs + k * c.step, plate: K.f[k], ease: easeIO });
    }

    list.push({ at: c.F0, plate: K.f[4] }, { at: c.F1, plate: K.claim, ease: easeIO });

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
    const shape = keyframes(W, H, wide, baseS, m.gutter, frame, tokens);
    const c = claimTimes(m, tokens);
    const trackLen = tokens.track.trackLen * H;

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
        story: shape.story,
        storyK: shape.storyK,
        kqTop: shape.kqTop,
        pins: pickPins(map, red, shape.K.b2, frame.cover),
        top: m.tops,
        maxY: Math.max(1, m.scrollHeight - H),
        c,
        stops: buildStops(H, shape.K, m.tops, c, trackLen, tokens),
        trackLen,
        dist: (wide ? tokens.track.wideDist : tokens.track.tallDist) * W,
        panelX: wide ? [m.gutter, 1.16 * W, 1.46 * W] : [m.gutter, W + m.gutter, 2 * W + m.gutter],
    };
}

// the plate at a scroll position; reduced motion jumps halfway and shows the track's end
function plateAt(y: number, stops: Stop[], reduced: boolean) {
    if (y <= stops[0].at) {
        return stops[0].plate;
    }

    for (let i = 0; i < stops.length - 1; i++) {
        const next = stops[i + 1];

        if (y < next.at) {
            let t = (y - stops[i].at) / (next.at - stops[i].at);

            if (reduced) {
                t = next.track || t >= 0.5 ? 1 : 0;
            } else if (next.ease) {
                t = next.ease(t);
            }

            return mixPlates(stops[i].plate, next.plate, t);
        }
    }

    return stops[stops.length - 1].plate;
}

export function readScroll(y: number, L: LandingLayout, tokens: LandingTokens, reduced: boolean): ScrollState {
    const H = L.H;
    const [t2, t3, t4, t5] = L.top;
    const snap = (t: number) => (reduced ? (t < 0.5 ? 0 : 1) : t);
    const trk = clamp((y - t5) / L.trackLen);
    const f = (y - L.c.hs) / L.c.step + tokens.kq.move / 2;
    const kq = Math.max(0, Math.min(4, Math.floor(f)));
    let kqU = clamp(f - kq);

    if (f < 0) {
        kqU = 0;
    } else if (kq === 4) {
        kqU = clamp((f - 4) / 1.2);
    }

    return {
        y,
        plate: plateAt(y, L.stops, reduced),
        hero: clamp((y - 0.04 * H) / Math.max(1, t2 - 0.04 * H)),
        dive: snap(clamp((y - (t3 - H)) / H)),
        h3: snap(clamp((y - t3) / Math.max(1, t4 - H - t3))),
        lens: snap(clamp((y - (t4 - H)) / H)),
        h4: clamp((y - t4) / Math.max(1, t5 - H - t4)),
        frame: snap(clamp((y - (t5 - H)) / H)),
        trk,
        g: reduced ? 1 : trackEase(trk, tokens),
        kq,
        kqU,
        p7: snap(clamp((y - L.c.l0) / (tokens.lift.span * H))),
        prog: clamp(y / L.maxY),
    };
}

// exit groups: hero lines, hero side, 02, 03, 04, 06; each slides off while its frame leaves
export function exitSpans(L: LandingLayout, tokens: LandingTokens): Point[] {
    const H = L.H;
    const [t2, t3, t4, t5] = L.top;
    const x = tokens.split.span * H;
    const a0 = (t: number) => t - H - tokens.split.lead * H;

    return [
        [0.04 * H, t2 * 0.85],
        [0.35 * t2, 0.95 * t2],
        [t3 - H, t3 - H + x],
        [a0(t4), a0(t4) + x],
        [a0(t5), a0(t5) + x],
        [L.c.F0 - tokens.kq.exitLead * H, L.c.F0 + (tokens.kq.exit - tokens.kq.exitLead) * H],
    ];
}

// one element's slide in px; the 06 index leaves as a staggered column pushed left
export function exitOffset(group: number, index: number, y: number, L: LandingLayout, tokens: LandingTokens) {
    const [a, b] = exitSpans(L, tokens)[group];
    const column = group === 5;
    const e = easeIn(clamp((y - a - (column ? index * tokens.kq.exitStagger * L.H : 0)) / (b - a)));
    const side = index % 2 ? 1 : -1;

    return (column ? -tokens.kq.exitDist : side * tokens.split.dist) * e * L.W;
}

export type Ground = "paper" | "dark" | "grey";

// the colour under the plate: paper, dark, grey (curtain), dark, paper
export function groundAt(y: number, L: LandingLayout): Ground {
    const [, t3, , t5, t6] = L.top;

    if (y < t3 + 0.3 * L.H) {
        return "paper";
    }

    if (y < t5) {
        return "dark";
    }

    if (y < t6) {
        return "grey";
    }

    return y < L.c.F1 ? "dark" : "paper";
}

// the beat pill: the last beat whose top has passed the middle of the screen
export function beatAt(y: number, L: LandingLayout) {
    const probe = y + 0.5 * L.H;
    let k = 0;

    L.top.forEach((t, i) => {
        if (probe >= t) {
            k = i + 1;
        }
    });

    if (y >= L.c.rev) {
        k = 6;
    }

    return { index: k, name: BEAT_NAMES[k] };
}

// 06 scene opacity: fades in after 05 is covered and out as the bath floods back
export function keptQuietOpacity(y: number, L: LandingLayout, tokens: LandingTokens) {
    const t6 = L.top[4];
    const H = L.H;

    if (y <= t6 + 1 || y >= L.c.F1) {
        return 0;
    }

    return smoothstep(t6 + 0.12 * H, t6 + 0.4 * H, y) * (1 - smoothstep(L.c.F0, L.c.rev + tokens.kq.fadeTail * H, y));
}
