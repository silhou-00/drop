// Motion tokens: the named movements the app uses, in the vocabulary of the motion
// reference at motion-reference.takayustudio.jp, as approved on the design sheet. Each
// app token holds a duration in milliseconds, an easing name from the easings file, and a
// distance (px), a starting scale or a step where the movement needs one. The schema sets
// the tweak sliders.
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
