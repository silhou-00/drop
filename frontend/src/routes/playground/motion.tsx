// Dev-only playground page for the motion tokens. Every token animates a sample box
// side by side through the Web Animations API, started one stagger step apart, and
// the replay button runs them all again. Durations, easings, distances, scales and the
// spring are tuned in the tweak panel. Outside the dev server the route answers "not found".
import { useCallback, useEffect, useRef } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cssEasing, sampleSpring } from "@/lib/motion/easings";
import { motionDefaults, motionSchema, type MotionTokens } from "@/lib/motion/tokens";
import { useTweaks } from "@/lib/tweaks/use-tweaks";

type Demo = { name: string; keyframes: Keyframe[]; duration: number; easing: string };

export const Route = createFileRoute("/playground/motion")({
    beforeLoad: () => {
        if (!import.meta.env.DEV) {
            throw notFound();
        }
    },
    component: MotionPlayground,
});

// one demo per token, built from the live values
function buildDemos(motion: MotionTokens): Demo[] {
    const spring = sampleSpring(motion.springFollow);
    const { fadeSlide, overshoot, bounceLand, popScale, squash } = motion;

    return [
        {
            name: "fadeSlide",
            keyframes: [
                { opacity: 0, transform: `translateY(${fadeSlide.distance}px)` },
                { opacity: 1, transform: "translateY(0)" },
            ],
            duration: fadeSlide.duration,
            easing: cssEasing(fadeSlide.easing),
        },
        {
            name: "overshoot",
            keyframes: [{ transform: `translateX(-${overshoot.distance}px)` }, { transform: "translateX(0)" }],
            duration: overshoot.duration,
            easing: cssEasing(overshoot.easing),
        },
        {
            name: "bounceLand",
            keyframes: [{ transform: `translateY(-${bounceLand.distance}px)` }, { transform: "translateY(0)" }],
            duration: bounceLand.duration,
            easing: cssEasing(bounceLand.easing),
        },
        {
            name: "springFollow",
            keyframes: [
                { transform: `translateX(-${motion.springFollow.distance}px)` },
                { transform: "translateX(0)" },
            ],
            duration: spring.duration,
            easing: spring.easing,
        },
        {
            name: "popScale",
            keyframes: [
                { opacity: 0, transform: `scale(${popScale.scale})` },
                { opacity: 1, transform: "scale(1)" },
            ],
            duration: popScale.duration,
            easing: cssEasing(popScale.easing),
        },
        {
            name: "squash",
            keyframes: [{ transform: `scale(${2 - squash.scale}, ${squash.scale})` }, { transform: "scale(1, 1)" }],
            duration: squash.duration,
            easing: cssEasing(squash.easing),
        },
    ];
}

function MotionPlayground() {
    const motion = useTweaks("Motion", motionDefaults, motionSchema);
    const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
    const demos = buildDemos(motion);

    const replay = useCallback(() => {
        const current = buildDemos(motion);

        current.forEach((demo, index) => {
            boxRefs.current[index]?.animate(demo.keyframes, {
                duration: demo.duration,
                easing: demo.easing,
                delay: index * motion.stagger.step,
                fill: "both",
            });
        });
    }, [motion]);

    // replays whenever a value changes, so each slider move is visible at once
    useEffect(() => {
        replay();
    }, [replay]);

    return (
        <main>
            {/* heading section */}
            <section className="section">
                {/* title row */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <h1 className="text-heading font-semibold">Motion</h1>
                        </div>
                    </div>
                    <div className="placement">
                        <div className="container">
                            <Button onClick={replay}>Replay</Button>
                        </div>
                    </div>
                </div>

                {/* token demos */}
                <div className="sub-section grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                    {demos.map((demo, index) => (
                        <div key={demo.name} className="placement flex-col">
                            <div className="container items-center">
                                <div
                                    ref={(element) => {
                                        boxRefs.current[index] = element;
                                    }}
                                    className="aspect-square w-16 rounded-lg bg-[#ff3131]"
                                />
                            </div>
                            <div className="container items-center">
                                <p className="text-caption font-mono">{demo.name}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
