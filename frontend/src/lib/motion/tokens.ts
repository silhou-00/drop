// Motion tokens: the named movements the app uses, in the vocabulary of the motion
// reference at motion-reference.takayustudio.jp, as approved on the design sheet. Each
// app token holds a duration in milliseconds, an easing name from the easings file, and a
// distance (px), a starting scale or a step where the movement needs one. The schema sets
// the tweak sliders. The landing tokens below copy the landing comp's motion values
// (window.__bath.T in bath.js) one to one; they hold lists, so they are not tweakable.
import type { TweakSchema } from "@/lib/tweaks/model";
import { EASING_NAMES, SPRINGS } from "./easings";

const DURATION = { min: 100, max: 2000, step: 10 };
const DISTANCE = { min: 0, max: 200, step: 1 };
const SCALE = { min: 0, max: 1.5, step: 0.01 };
const EASING = { options: EASING_NAMES };
const SPRING = {
    mass: { min: 0.1, max: 5, step: 0.1 },
    stiffness: { min: 10, max: 600, step: 1 },
    damping: { min: 1, max: 60, step: 0.5 },
};

export const motionDefaults = {
    fadeSlide: { duration: 600, easing: "easeOutCubic", distance: 24 },
    overshoot: { duration: 600, easing: "easeOutBack", distance: 32 },
    bounceLand: { duration: 700, easing: "easeOutBounce", distance: 48 },
    springFollow: { ...SPRINGS.springFollow, distance: 64 },
    popScale: { duration: 520, easing: "easeOutBack", scale: 0.6 },
    squash: { duration: 620, easing: "easeOutBack", scale: 0.8 },
    stagger: { step: 60 },
    pressFeedback: { duration: 140, easing: "easeOutCubic", scale: 0.97 },
    rippleReveal: { duration: 950, easing: "easeOutCubic" },
    letterStagger: { duration: 600, easing: "easeOutCubic", step: 30 },
    nudge: { duration: 520, easing: "easeOutBack", distance: 6 },
    iris: { duration: 760, easing: "easeOutQuart" },
    lightSweep: { duration: 950, easing: "easeInOutCubic" },
    marbleDrift: { duration: 60000, easing: "linear" },
    shaderFadeIn: { duration: 400, easing: "easeOutCubic" },
    tabSpring: { ...SPRINGS.springSnappy },
    reducedFade: { duration: 200, easing: "linear" },
};

export type MotionTokens = typeof motionDefaults;

export const motionSchema: TweakSchema<MotionTokens> = {
    fadeSlide: { duration: DURATION, easing: EASING, distance: DISTANCE },
    overshoot: { duration: DURATION, easing: EASING, distance: DISTANCE },
    bounceLand: { duration: DURATION, easing: EASING, distance: DISTANCE },
    springFollow: { ...SPRING, distance: DISTANCE },
    popScale: { duration: DURATION, easing: EASING, scale: SCALE },
    squash: { duration: DURATION, easing: EASING, scale: SCALE },
    stagger: { step: { min: 0, max: 300, step: 5 } },
    pressFeedback: { duration: DURATION, easing: EASING, scale: SCALE },
    rippleReveal: { duration: DURATION, easing: EASING },
    letterStagger: { duration: DURATION, easing: EASING, step: { min: 0, max: 200, step: 1 } },
    nudge: { duration: DURATION, easing: EASING, distance: DISTANCE },
    iris: { duration: DURATION, easing: EASING },
    lightSweep: { duration: DURATION, easing: EASING },
    marbleDrift: { duration: { min: 5000, max: 180000, step: 1000 }, easing: EASING },
    shaderFadeIn: { duration: DURATION, easing: EASING },
    tabSpring: SPRING,
    reducedFade: { duration: DURATION, easing: EASING },
};

// landing comp motion (bath.js T): scroll fractions are of one screen height unless noted
export const landingMotion = {
    // headings rise through a mask on entry; pop is the pin and badge pop
    rise: { dur: 640, stagger: 80, pop: 520 },
    // headings split and slide off while their frame leaves
    split: { dist: 0.55, span: 0.45, lead: 0.25 },
    // camera zoom per beat: dive into the pin (b3), lens (b4), phone (b5)
    zoom: { tall: { b2: 1.3, b3: 2.3, b4: 3.2, b5: 1.5 }, wide: { b2: 1.3, b3: 2.4, b4: 3.4, b5: 1.5 } },
    // the lens beat keeps this much of the combed street map
    comb: { b4: 0.4 },
    curtain: { tilt: 0.05 },
    track: { hold: 0.2, wideDist: 1.0, tallDist: 2.0, trackLen: 1.6 },
    // 06 index: start, flood, reveal, liftAt and exit in screens; move and act are fractions of one step
    kq: {
        start: 0.2,
        move: 0.55,
        act: 0.35,
        band: [0.22, 0.34],
        ringFit: 0.28,
        stamp: [0.42, 240],
        zoom: [1, 2.6, 1.6, 2, 1.25],
        anchor: [
            [0.72, 0.3],
            [0.5, 0.5],
            [0.3, 0.7],
            [0.72, 0.66],
            [0.5, 0.32],
        ],
        tick: 900,
        fadeTail: 0.05,
        flood: 0.45,
        reveal: 0.15,
        liftAt: 0.15,
        exit: 0.3,
        exitLead: 0.15,
        exitDist: 1.1,
        exitStagger: 0.015,
    },
    // the bath lifts off like a sheet of paper from one corner
    lift: { deg: 64, x: 8, y: 34, span: 0.5 },
    scramble: { tick: 40, lockDelay: 120, lockDur: 640 },
    iris: { dur: 760 },
    // the ink drop's travelling ring that pushes the veins outward
    ripple: { push: 2.4, speed: 4.2 },
} as const;

export type LandingMotionTokens = typeof landingMotion;
