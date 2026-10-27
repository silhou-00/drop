// Named easing curves and spring presets for every animation in the app. Curves that
// a cubic-bezier can express carry their control points; every curve also has a plain
// function from progress (0..1) to eased progress. cssEasing turns a name into a CSS
// or Web Animations easing string, sampling the curve into linear() when a bezier
// cannot express it (bounce, elastic). sampleSpring does the same for a spring preset.

export type Bezier = readonly [number, number, number, number];
export type EasingFunction = (t: number) => number;
export type SpringPreset = { mass: number; stiffness: number; damping: number };

export const EASING_NAMES = [
    "linear",
    "easeOutCubic",
    "easeInOutCubic",
    "easeOutQuart",
    "easeInOutQuint",
    "easeOutExpo",
    "easeOutBack",
    "easeInBack",
    "easeOutBounce",
    "easeOutElastic",
    "easeInOutSine",
] as const;

export type EasingName = (typeof EASING_NAMES)[number];

const BACK_C1 = 1.70158;
const BACK_C3 = BACK_C1 + 1;
const ELASTIC_C4 = (2 * Math.PI) / 3;
const BOUNCE_N1 = 7.5625;
const BOUNCE_D1 = 2.75;
const CSS_SAMPLES = 40;
const SPRING_STEP = 1 / 120;
const SPRING_MAX_SECONDS = 4;
const SPRING_REST = 0.001;

export const BEZIERS: Partial<Record<EasingName, Bezier>> = {
    linear: [0, 0, 1, 1],
    easeOutCubic: [0.33, 1, 0.68, 1],
    easeInOutCubic: [0.65, 0, 0.35, 1],
    easeOutQuart: [0.25, 1, 0.5, 1],
    easeInOutQuint: [0.83, 0, 0.17, 1],
    easeOutExpo: [0.16, 1, 0.3, 1],
    easeOutBack: [0.34, 1.56, 0.64, 1],
    easeInBack: [0.36, 0, 0.66, -0.56],
    easeInOutSine: [0.37, 0, 0.63, 1],
};

// bounce curve behind easeOutBounce
function bounceOut(t: number) {
    if (t < 1 / BOUNCE_D1) {
        return BOUNCE_N1 * t * t;
    }

    if (t < 2 / BOUNCE_D1) {
        const u = t - 1.5 / BOUNCE_D1;

        return BOUNCE_N1 * u * u + 0.75;
    }

    if (t < 2.5 / BOUNCE_D1) {
        const u = t - 2.25 / BOUNCE_D1;

        return BOUNCE_N1 * u * u + 0.9375;
    }

    const u = t - 2.625 / BOUNCE_D1;

    return BOUNCE_N1 * u * u + 0.984375;
}

export const EASINGS: Record<EasingName, EasingFunction> = {
    linear: (t) => t,
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    easeOutQuart: (t) => 1 - Math.pow(1 - t, 4),
    easeInOutQuint: (t) => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2),
    easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    easeOutBack: (t) => 1 + BACK_C3 * Math.pow(t - 1, 3) + BACK_C1 * Math.pow(t - 1, 2),
    easeInBack: (t) => BACK_C3 * t * t * t - BACK_C1 * t * t,
    easeOutBounce: bounceOut,
    easeOutElastic: (t) => {
        if (t === 0 || t === 1) {
            return t;
        }

        return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ELASTIC_C4) + 1;
    },
    easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

export const SPRINGS = {
    springFollow: { mass: 1, stiffness: 80, damping: 10 },
    springSnappy: { mass: 1, stiffness: 300, damping: 24 },
    springGentle: { mass: 1, stiffness: 120, damping: 20 },
} satisfies Record<string, SpringPreset>;

export function isEasingName(name: string): name is EasingName {
    return (EASING_NAMES as readonly string[]).includes(name);
}

function toLinear(points: number[]) {
    return `linear(${points.map((point) => point.toFixed(4)).join(", ")})`;
}

// CSS / WAAPI easing string for a named curve
export function cssEasing(name: string): string {
    const easing: EasingName = isEasingName(name) ? name : "linear";
    const bezier = BEZIERS[easing];

    if (bezier) {
        return `cubic-bezier(${bezier.join(", ")})`;
    }

    const points: number[] = [];

    for (let i = 0; i <= CSS_SAMPLES; i++) {
        points.push(EASINGS[easing](i / CSS_SAMPLES));
    }

    return toLinear(points);
}

// simulates a unit spring from 0 to 1 until it settles
export function sampleSpring(preset: SpringPreset): { duration: number; easing: string } {
    const positions: number[] = [];
    let position = 0;
    let velocity = 0;
    let time = 0;

    while (time < SPRING_MAX_SECONDS) {
        const force = -preset.stiffness * (position - 1) - preset.damping * velocity;

        velocity += (force / preset.mass) * SPRING_STEP;
        position += velocity * SPRING_STEP;
        time += SPRING_STEP;
        positions.push(position);

        if (Math.abs(position - 1) < SPRING_REST && Math.abs(velocity) < SPRING_REST) {
            break;
        }
    }

    const stride = Math.max(1, Math.floor(positions.length / CSS_SAMPLES));
    const points = [0];

    for (let i = stride; i < positions.length; i += stride) {
        points.push(positions[i]);
    }

    points.push(1);

    return { duration: Math.round(time * 1000), easing: toLinear(points) };
}
