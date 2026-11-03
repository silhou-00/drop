// Landing scenes: the pure maths behind what the bath and its objects do at each scroll point.
// The plate is a window onto the one marble shader: its rectangle, corner radius and camera (a
// point on the red pin held at a screen anchor, with a zoom) are keyframed for the hero (full
// screen) and the three plate beats: the map window, the dive and the lens. The street map
// repeats the shader's own sums, so pins, rings and the peeled note sit exactly on the lines
// the shader draws. Also the note's path through the dive and the lens, the sender scramble and
// the small helpers the sections ease with. Nothing here touches the page; components apply
// the numbers.
import { COMB_ANGLE, type MarbleFrame } from "@/lib/marble/renderer";
import { EASINGS } from "@/lib/motion/easings";
import type { LandingTokens } from "./tokens";

export type Point = [number, number];
export type Rect = { x: number; y: number; w: number; h: number; r: number };
export type Plate = Rect & { sx: number; sy: number; z: number; comb: number };
export type Keyframes = { hero: Plate; b2: Plate; b3: Plate; b4: Plate };
export type RedPin = { q: Point; row: number; cross: number; i: number; k: number };
export type ScenePin = { q: Point; d: number; s: Point };
export type SceneShape = { K: Keyframes; card3: Point };

const CROSS_OFFSETS = [0, 8, 14, 24, 31];
const MEET_STEPS = 5;
const PIN_COUNT = 7;
const PIN_PAD = 36;
const PIN_TOP = 40;
const RING_LINES = 7;

export const easeIO = EASINGS.easeInOutCubic;
export const easeCubic = EASINGS.easeOutCubic;

export function clamp(x: number, a = 0, b = 1) {
    return Math.min(b, Math.max(a, x));
}

export function smoothstep(a: number, b: number, x: number) {
    const t = clamp((x - a) / (b - a));

    return t * t * (3 - 2 * t);
}

export function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

export function easeIn(t: number) {
    return t * t * t;
}

function hj(n: number) {
    const x = n * 0.6180339887 + 0.137;

    return x - Math.floor(x);
}

// street map: u = R(angle) * (q - centre), with the shader's jitter, bend and wobble
export function streetMap(frame: MarbleFrame, tokens: LandingTokens) {
    const g = frame.gap;
    const period = 40 * g;
    const cx = frame.w / 2;
    const cy = frame.h / 2;
    const ca = Math.cos(COMB_ANGLE);
    const sa = Math.sin(COMB_ANGLE);
    const bend = tokens.streets.bend * g;
    const wobble = tokens.streets.wobble * g;
    const jit = tokens.streets.jit * g;

    function toRef(ux: number, uy: number): Point {
        return [cx + ca * ux + sa * uy, cy - sa * ux + ca * uy];
    }

    function toU(q: Point): Point {
        const dx = q[0] - cx;
        const dy = q[1] - cy;

        return [ca * dx - sa * dy, sa * dx + ca * dy];
    }

    function cross(k: number, j: number) {
        return k * period + CROSS_OFFSETS[j] * g + (j ? (hj(k * 5 + j) - 0.5) * jit : 0);
    }

    // where main row Y meets cross street X, solved through the bend and the wobble
    function meet(row: number, crossX: number): Point {
        let ux = crossX;
        let uy = row;

        for (let n = 0; n < MEET_STEPS; n++) {
            ux = crossX + bend * Math.sin((uy / g) * 0.035 + 0.6);
            uy = row - wobble * Math.sin((ux / g) * 0.05 + 1.1);
        }

        return toRef(ux, uy);
    }

    return { g, period, toU, cross, meet };
}

export type StreetMap = ReturnType<typeof streetMap>;

// the red pin: the street corner closest to where the hero drop lands
export function findRedPin(map: StreetMap, frame: MarbleFrame): RedPin {
    const au = map.toU(frame.aim);
    const i0 = Math.round(au[1] / (6 * map.g));
    const k0 = Math.floor(au[0] / map.period);
    let best: (RedPin & { d: number }) | null = null;

    for (let i = i0 - 2; i <= i0 + 2; i++) {
        for (let k = k0 - 1; k <= k0 + 1; k++) {
            for (let j = 0; j < CROSS_OFFSETS.length; j++) {
                const row = i * 6 * map.g;
                const crossX = map.cross(k, j);
                const q = map.meet(row, crossX);
                const d = Math.hypot(q[0] - frame.aim[0], q[1] - frame.aim[1]);

                if (!best || d < best.d) {
                    best = { q, row, cross: crossX, i, k, d };
                }
            }
        }
    }

    const found = best as RedPin & { d: number };

    return { q: found.q, row: found.row, cross: found.cross, i: found.i, k: found.k };
}

function plateOf(rect: Rect, anchor: Point, z: number, comb: number): Plate {
    return { ...rect, sx: anchor[0], sy: anchor[1], z, comb };
}

function middle(rect: Rect): Point {
    return [rect.x + rect.w / 2, rect.y + rect.h / 2];
}

// plate keyframes per beat: rectangle, camera anchor, zoom and comb
export function keyframes(
    width: number,
    height: number,
    wide: boolean,
    baseS: Point,
    tokens: LandingTokens,
): SceneShape {
    const W = width;
    const H = height;
    const Z = wide ? tokens.zoom.wide : tokens.zoom.tall;
    const full: Rect = { x: 0, y: 0, w: W, h: H, r: 0 };
    const hero = plateOf(full, baseS, 1, 0);
    let b2: Plate;
    let b3: Plate;
    let b4: Plate;
    let card3: Point;

    if (wide) {
        const m = 0.115 * H;
        const w2: Rect = { x: 0.03 * W, y: m, w: 0.55 * W, h: 0.8 * H, r: 28 };
        const R = Math.min(0.36 * H, 0.2 * W);
        const lc: Point = [0.7 * W, 0.5 * H];

        b2 = plateOf(w2, middle(w2), Z.b2, 1);
        b3 = plateOf(full, [0.66 * W, 0.47 * H], Z.b3, 1);
        b4 = plateOf({ x: lc[0] - R, y: lc[1] - R, w: 2 * R, h: 2 * R, r: R }, lc, Z.b4, tokens.comb.b4);
        card3 = [0.8 * W, 0.38 * H];
    } else {
        const m = Math.max(86, 0.1 * H);
        const w2: Rect = { x: 0.035 * W, y: m, w: 0.93 * W, h: 0.6 * H - m, r: 24 };
        const R = Math.min(0.43 * W, 0.27 * H);
        const lc: Point = [0.5 * W, 0.36 * H];

        b2 = plateOf(w2, middle(w2), Z.b2, 1);
        b3 = plateOf(full, [0.5 * W, 0.55 * H], Z.b3, 1);
        b4 = plateOf({ x: lc[0] - R, y: lc[1] - R, w: 2 * R, h: 2 * R, r: R }, lc, Z.b4, tokens.comb.b4);
        card3 = [0.5 * W, 0.4 * H];
    }

    return { K: { hero, b2, b3, b4 }, card3 };
}

// pins for the map window: street corners near the red pin that land inside the window
export function pickPins(map: StreetMap, red: RedPin, b2: Plate, cover: number): ScenePin[] {
    const sc = cover * b2.z;
    const found: ScenePin[] = [];

    for (let i = red.i - 5; i <= red.i + 5; i++) {
        for (let k = red.k - 2; k <= red.k + 2; k++) {
            for (let j = 0; j < CROSS_OFFSETS.length; j++) {
                const q = map.meet(i * 6 * map.g, map.cross(k, j));
                const s: Point = [b2.sx + (q[0] - red.q[0]) * sc, b2.sy + (q[1] - red.q[1]) * sc];
                const inside =
                    s[0] > b2.x + PIN_PAD &&
                    s[0] < b2.x + b2.w - PIN_PAD &&
                    s[1] > b2.y + PIN_PAD + PIN_TOP &&
                    s[1] < b2.y + b2.h - PIN_PAD;

                if (inside) {
                    found.push({ q, d: Math.hypot(s[0] - b2.sx, s[1] - b2.sy), s });
                }
            }
        }
    }

    found.sort((a, b) => a.d - b.d);

    const pick: ScenePin[] = [];
    const minD = Math.min(b2.w, b2.h) * 0.2;

    for (const pin of found) {
        if (pick.length >= PIN_COUNT) {
            break;
        }

        if (pick.every((other) => Math.hypot(other.s[0] - pin.s[0], other.s[1] - pin.s[1]) > minD)) {
            pick.push(pin);
        }
    }

    if (!pick.length || pick[0].d > 1) {
        pick.unshift({ q: red.q, d: 0, s: [b2.sx, b2.sy] });
    }

    return pick.slice(0, PIN_COUNT);
}

// a bath point on screen under the current plate camera
export function toScreen(q: Point, plate: Plate, red: Point, cover: number): Point {
    const k = cover * plate.z;

    return [plate.sx + (q[0] - red[0]) * k, plate.sy + (q[1] - red[1]) * k];
}

// radius of the 150 m ring at the current zoom
export function ringRadius(frame: MarbleFrame, plate: Plate) {
    return frame.gap * RING_LINES * frame.cover * plate.z;
}

// interpolates two plates; zoom moves in log space so the dive feels even
export function mixPlates(a: Plate, b: Plate, t: number): Plate {
    return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        w: lerp(a.w, b.w, t),
        h: lerp(a.h, b.h, t),
        r: lerp(a.r, b.r, t),
        sx: lerp(a.sx, b.sx, t),
        sy: lerp(a.sy, b.sy, t),
        z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), t)),
        comb: lerp(a.comb, b.comb, t),
    };
}

// the note's centre through the dive (lift) and the lens
export function noteCentre(plate: Plate, K: Keyframes, card3: Point, progress: { u: number; lens: number }): Point {
    const lc: Point = [K.b4.sx, K.b4.sy];

    if (progress.lens > 0) {
        const e = easeIO(progress.lens);

        return [lerp(card3[0], lc[0], e), lerp(card3[1], lc[1], e)];
    }

    const eu = easeIO(progress.u);

    return [lerp(plate.sx, card3[0], eu), lerp(plate.sy, card3[1], eu)];
}

const GLYPHS = "abcdefghijklmnopqrstuvwxyz#%&?*+";

export function randomGlyphs(count: number) {
    let text = "";

    for (let k = 0; k < count; k++) {
        text += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }

    return text;
}

// a scramble that locks left to right after a delay; spaces stay spaces
export function scrambleText(final: string, elapsed: number, tokens: LandingTokens) {
    const locked = Math.floor(clamp((elapsed - tokens.scramble.lockDelay) / tokens.scramble.lockDur) * final.length);
    const tail = randomGlyphs(final.length - locked).replace(/./g, (glyph, i) =>
        final[locked + i] === " " ? " " : glyph,
    );

    return final.slice(0, locked) + tail;
}
