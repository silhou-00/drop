// Motion tokens: the named movements the app uses, in the vocabulary of the motion
// reference at motion-reference.takayustudio.jp. Each token holds a duration in
// milliseconds, an easing name from the easings file, and a distance (px) or a
// starting scale where the movement needs one. The schema sets the tweak sliders.
import type { TweakSchema } from "@/lib/tweaks/model";
import { EASING_NAMES, SPRINGS } from "./easings";

const DURATION = { min: 100, max: 2000, step: 10 };
const DISTANCE = { min: 0, max: 200, step: 1 };
const SCALE = { min: 0, max: 1.5, step: 0.01 };
const EASING = { options: EASING_NAMES };

export const motionDefaults = {
    fadeSlide: { duration: 600, easing: "easeOutCubic", distance: 24 },
    overshoot: { duration: 600, easing: "easeOutBack", distance: 32 },
    bounceLand: { duration: 700, easing: "easeOutBounce", distance: 48 },
    springFollow: { ...SPRINGS.springFollow, distance: 64 },
    popScale: { duration: 520, easing: "easeOutBack", scale: 0.6 },
    squash: { duration: 620, easing: "easeOutBack", scale: 0.8 },
    stagger: { step: 60 },
};

export type MotionTokens = typeof motionDefaults;

export const motionSchema: TweakSchema<MotionTokens> = {
    fadeSlide: { duration: DURATION, easing: EASING, distance: DISTANCE },
    overshoot: { duration: DURATION, easing: EASING, distance: DISTANCE },
    bounceLand: { duration: DURATION, easing: EASING, distance: DISTANCE },
    springFollow: {
        mass: { min: 0.1, max: 5, step: 0.1 },
        stiffness: { min: 10, max: 600, step: 1 },
        damping: { min: 1, max: 60, step: 0.5 },
        distance: DISTANCE,
    },
    popScale: { duration: DURATION, easing: EASING, scale: SCALE },
    squash: { duration: DURATION, easing: EASING, scale: SCALE },
    stagger: { step: { min: 0, max: 300, step: 5 } },
};
