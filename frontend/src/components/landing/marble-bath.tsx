// The marble behind the whole landing, from the hero to the bottom of the footer. Two fixed
// layers: the ground (the colour under the plate, paper everywhere and dark from the dive
// through the lens) and the plate, a clipped window onto the one marble canvas. Outside the
// three beats after the hero the plate is the full screen with no camera, so the page keeps one
// calm look and the scroll only moves the calm boxes behind the copy in view. Inside the beats
// the plate's rectangle, corners and camera follow the timeline: the map window, the dive and
// the lens. A still poster sits under the canvas and moves with the same camera, so the first
// paint, reduced motion and any WebGL failure all show the same bath. The canvas fades in over
// the poster once it has drawn; when WebGL is missing, fails or is too slow, the poster stays.
import { useEffect, useRef, useState } from "react";
import { createMarble, type MarbleHandle } from "@/lib/marble/renderer";
import { marbleDefaults } from "@/lib/marble/tokens";
import { motionDefaults } from "@/lib/motion/tokens";
import { clamp } from "@/lib/landing/scenes";
import { groundAt, type Ground } from "@/lib/landing/timeline";
import { useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

const GROUND_COLOURS: Record<Ground, string> = {
    paper: "var(--paper)",
    dark: "var(--on-dark-ground)",
};
const RIPPLE_END = 4;
const INK_CAP = 0.999;
const CANVAS_DELAY = 0.1;

export function MarbleBath() {
    const { reduced, tokens, runtime, invalidate } = useLanding();
    const [failed, setFailed] = useState(false);
    const [stillKey, setStillKey] = useState<"port" | "land">("port");
    const groundRef = useRef<HTMLDivElement>(null);
    const edgeRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const camRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inkRef = useRef<HTMLImageElement>(null);
    const combRef = useRef<HTMLImageElement>(null);
    const handleRef = useRef<MarbleHandle | null>(null);
    const lastRef = useRef({
        ink: -1,
        boxes: "",
        clip: "",
        edge: "",
        cam: "",
        ground: "",
        view: "",
        comb: -1,
        startedAt: 0,
    });
    const live = !reduced && !failed;

    // the renderer, created once per motion setting and driven by the frame loop
    useEffect(() => {
        const canvas = canvasRef.current;

        if (!canvas || !live) {
            return;
        }

        const handle = createMarble(canvas, marbleDefaults, {
            zone: "hero",
            mode: "light",
            driftPeriod: motionDefaults.marbleDrift.duration,
            external: true,
            onFail: () => {
                handleRef.current = null;
                setFailed(true);
            },
        });

        if (!handle) {
            setFailed(true);

            return;
        }

        handle.setProgress(0);
        handleRef.current = handle;
        lastRef.current = { ...lastRef.current, ink: -1, boxes: "", view: "", comb: -1, startedAt: performance.now() };

        return () => {
            handle.destroy();
            handleRef.current = null;
        };
    }, [live]);

    // still layers that just appeared take their state on the next frame
    useEffect(() => {
        invalidate();
    }, [live, stillKey, invalidate]);

    useTimelineFrame(({ L, S, now, changed, relaid }) => {
        const last = lastRef.current;
        const p = S.plate;
        const handle = handleRef.current;
        const since = runtime.impactAt === null ? -1 : (now - runtime.impactAt) / 1000;
        const rippling = since >= 0 && since < RIPPLE_END;

        if (relaid && L.frame.key !== stillKey) {
            setStillKey(L.frame.key);
        }

        if (changed) {
            const sheet = sheetRef.current;
            const edge = edgeRef.current;
            const cam = camRef.current;
            const ground = groundRef.current;

            // clip window, its shadow, and the poster on the same camera
            if (sheet && edge && cam) {
                const clip = `inset(${p.y.toFixed(1)}px ${(L.W - p.x - p.w).toFixed(1)}px ${(L.H - p.y - p.h).toFixed(1)}px ${p.x.toFixed(1)}px round ${p.r.toFixed(1)}px)`;
                const shown = clamp((L.W - p.w + L.H - p.h) / 40) * (p.h > 1 ? 1 : 0);
                const edgeKey = `${p.x.toFixed(1)}|${p.y.toFixed(1)}|${p.w.toFixed(1)}|${p.h.toFixed(1)}|${p.r.toFixed(1)}|${shown.toFixed(2)}`;
                const tx = p.sx - p.z * L.baseS[0];
                const ty = p.sy - p.z * L.baseS[1];
                const camKey = `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${p.z.toFixed(4)})`;

                if (clip !== last.clip) {
                    sheet.style.clipPath = clip;
                    last.clip = clip;
                }

                if (edgeKey !== last.edge) {
                    last.edge = edgeKey;
                    edge.style.transform = `translate3d(${p.x}px,${p.y}px,0)`;
                    edge.style.width = `${p.w}px`;
                    edge.style.height = `${p.h}px`;
                    edge.style.borderRadius = `${p.r}px`;
                    edge.style.opacity = String(shown);
                }

                if (camKey !== last.cam) {
                    cam.style.transform = camKey;
                    last.cam = camKey;
                }

                combRef.current?.classList.toggle("on", p.comb > 0.5);
            }

            // ground: paper under the map window, dark from the dive through the lens
            if (ground) {
                const g = groundAt(S.y, L);

                if (g !== last.ground) {
                    ground.style.background = GROUND_COLOURS[g];
                    edge?.classList.toggle("dark", g === "dark");
                    last.ground = g;
                }
            }

            if (!live) {
                inkRef.current?.classList.toggle("on", reduced || since >= 0);
            }
        }

        if (!handle) {
            return;
        }

        if (relaid) {
            handle.setScene({
                impactPoint: L.red.q,
                redStreet: [L.red.row, L.red.cross],
                streets: [tokens.streets.jit, tokens.streets.bend, tokens.streets.wobble],
                ripple: [tokens.ripple.push, tokens.ripple.speed],
                calmFeather: tokens.calm.feather,
                accent: tokens.bath.accent,
            });
        }

        // the live bath: only the plate window is shaded
        if (changed || rippling) {
            const view = `${p.x}|${p.y}|${p.w}|${p.h}|${p.sx}|${p.sy}|${p.z}|${L.W}|${L.H}`;
            const ink = Math.min(INK_CAP, since < 0 ? 0 : Math.min(1, since / tokens.load.inkDur));

            if (view !== last.view) {
                handle.setCamera({ point: L.red.q, anchor: [p.sx, p.sy], zoom: p.z });
                handle.setClip({ x: p.x, y: p.y, w: p.w, h: p.h });
                last.view = view;
            }

            if (p.comb !== last.comb) {
                handle.setScene({ comb: p.comb });
                last.comb = p.comb;
            }

            if (ink !== last.ink) {
                handle.setProgress(ink);
                last.ink = ink;
            }

            if (S.boxKey !== last.boxes) {
                handle.setScene({ calmBoxes: S.boxes });
                last.boxes = S.boxKey;
            }
        }

        if (rippling) {
            handle.setScene({ impactTime: since });
        }

        if (p.h > 1 && p.w > 1) {
            handle.frame(now);
        }

        if ((now - last.startedAt) / 1000 > CANVAS_DELAY) {
            canvasRef.current?.classList.add("on");
        }
    });

    return (
        <>
            {/* ground: the colour under the plate */}
            <section className="section grounds" aria-hidden="true">
                {/* ground layer */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container ground" ref={groundRef} />
                    </div>
                </div>
            </section>

            {/* plate: the bath, still poster first, the live shader fades over it */}
            <section className={live ? "section bath" : "section bath still-mode"} aria-hidden="true">
                {/* plate layers */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container edge" ref={edgeRef} />
                    </div>
                    <div className="placement sheet" ref={sheetRef}>
                        <div className="container cam" ref={camRef}>
                            <picture>
                                <source media="(min-aspect-ratio: 1/1)" srcSet="/landing/still-land-grey.webp" />
                                <img src="/landing/still-port-grey.webp" alt="" fetchPriority="high" decoding="async" />
                            </picture>
                            {live ? null : (
                                <>
                                    <img
                                        className="still-layer"
                                        ref={inkRef}
                                        src={`/landing/still-${stillKey}-ink.webp`}
                                        alt=""
                                    />
                                    <img
                                        className="still-layer"
                                        ref={combRef}
                                        src={`/landing/still-${stillKey}-comb.webp`}
                                        alt=""
                                    />
                                </>
                            )}
                        </div>
                        <div className="container">
                            {live ? <canvas className="bath-canvas" ref={canvasRef} /> : null}
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
