// The bath under the landing. Two fixed layers: the grounds (the full-bleed colour, wiped from
// paper to dark to grey and back per beat) and the plate, a clipped window onto the one marble
// canvas whose rectangle, corners and camera follow the timeline. A still poster sits under the
// canvas and moves with the same camera, so the first paint, reduced motion and any WebGL
// failure all show the same bath. At the claim the plate lifts away like a sheet of paper.
// The shader is drawn from the landing's frame loop; the renderer runs no loop of its own.
import { useEffect, useRef, useState } from "react";
import { createMarble, type MarbleHandle } from "@/lib/marble/renderer";
import { marbleDefaults } from "@/lib/marble/tokens";
import { motionDefaults } from "@/lib/motion/tokens";
import { liftTransform, smoothstep, clamp } from "@/lib/landing/scenes";
import { groundAt, type Ground } from "@/lib/landing/timeline";
import { useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

const GROUND_COLOURS: Record<Ground, string> = {
    paper: "var(--paper)",
    dark: "var(--on-dark-ground)",
    grey: "var(--ground)",
};
const RIPPLE_END = 4;
const INK_CAP = 0.999;
const CANVAS_DELAY = 0.1;

export function BathPlate() {
    const { reduced, tokens, runtime, invalidate } = useLanding();
    const [failed, setFailed] = useState(false);
    const [stillKey, setStillKey] = useState<"port" | "land">("port");
    const g0Ref = useRef<HTMLDivElement>(null);
    const g1Ref = useRef<HTMLDivElement>(null);
    const stageRef = useRef<HTMLElement>(null);
    const liftRef = useRef<HTMLDivElement>(null);
    const edgeRef = useRef<HTMLDivElement>(null);
    const sheetRef = useRef<HTMLDivElement>(null);
    const camRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const inkRef = useRef<HTMLImageElement>(null);
    const combRef = useRef<HTMLImageElement>(null);
    const handleRef = useRef<MarbleHandle | null>(null);
    const lastRef = useRef({ clip: "", edge: "", cam: "", g0: "", g1: "", view: "", mix: "", startedAt: 0 });
    const live = !reduced && !failed;
    const stillMode = !live;

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
        lastRef.current = { ...lastRef.current, view: "", mix: "", startedAt: performance.now() };

        return () => {
            handle.destroy();
            handleRef.current = null;
        };
    }, [live]);

    // still layers that just appeared take their state on the next frame
    useEffect(() => {
        invalidate();
    }, [stillMode, stillKey, invalidate]);

    useTimelineFrame(({ L, S, now, changed, relaid }) => {
        const last = lastRef.current;
        const p = S.plate;
        const handle = handleRef.current;

        if (relaid && L.frame.key !== stillKey) {
            setStillKey(L.frame.key);
        }

        if (changed) {
            // clip window, its shadow, and the poster on the same camera
            const sheet = sheetRef.current;
            const edge = edgeRef.current;
            const cam = camRef.current;

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

                sheet.classList.toggle("calm", p.calm > 0.5);
                combRef.current?.classList.toggle("on", p.comb > 0.5 && !handle);
            }

            // grounds: the base colour and the tilted grey curtain before 05
            const g0 = g0Ref.current;
            const g1 = g1Ref.current;

            if (g0 && g1) {
                const ground = groundAt(S.y, L);
                const t5 = L.top[3];
                let curtain = "inset(100% 0 0 0)";

                if (ground !== last.g0) {
                    g0.style.background = GROUND_COLOURS[ground];
                    edgeRef.current?.classList.toggle("dark", ground === "dark");
                    last.g0 = ground;
                }

                if (S.y > t5 - L.H && S.y < t5) {
                    const e = reduced ? (S.y > t5 - 0.5 * L.H ? 0 : L.H) : t5 - S.y;
                    const tilt = tokens.curtain.tilt * L.H * (e / L.H);

                    curtain = `polygon(0 ${(e + tilt).toFixed(1)}px,100% ${(e - tilt).toFixed(1)}px,100% 100%,0 100%)`;
                }

                if (curtain !== last.g1) {
                    g1.style.clipPath = curtain;
                    last.g1 = curtain;
                }
            }

            // 07: the bath lifts off like paper
            const lift = liftRef.current;
            const stage = stageRef.current;

            if (lift && stage && sheet) {
                if (reduced) {
                    lift.style.opacity = S.p7 >= 1 ? "0" : "1";
                } else {
                    lift.style.transform = liftTransform(S.p7, tokens);
                    sheet.style.setProperty("--lift", (S.p7 * S.p7 * (3 - 2 * S.p7)).toFixed(3));
                    lift.style.opacity = String(1 - smoothstep(0.82, 1, S.p7));
                }

                stage.style.visibility = S.p7 >= 0.999 ? "hidden" : "";
            }
        }

        // the live bath: only the plate window is shaded, and only while it is visible
        const visible = S.p7 < 0.999 && p.h > 1 && p.w > 1;

        if (!handle || !visible) {
            return;
        }

        const view = `${p.x}|${p.y}|${p.w}|${p.h}|${p.sx}|${p.sy}|${p.z}|${L.W}|${L.H}`;
        const mix = `${p.comb}|${p.calm}`;

        if (relaid) {
            handle.setScene({
                impactPoint: L.red.q,
                redStreet: [L.red.row, L.red.cross],
                streets: [tokens.streets.jit, tokens.streets.bend, tokens.streets.wobble],
                ripple: [tokens.ripple.push, tokens.ripple.speed],
                accent: tokens.shader.accent,
            });
        }

        if (view !== last.view) {
            handle.setCamera({ point: L.red.q, anchor: [p.sx, p.sy], zoom: p.z });
            handle.setClip({ x: p.x, y: p.y, w: p.w, h: p.h });
            last.view = view;
        }

        if (mix !== last.mix) {
            handle.setScene({ comb: p.comb, calm: p.calm });
            last.mix = mix;
        }

        if (runtime.impactAt !== null) {
            const since = (now - runtime.impactAt) / 1000;

            if (since < RIPPLE_END) {
                handle.setScene({ impactTime: since });
                handle.setProgress(Math.min(INK_CAP, since / tokens.load.inkDur));
            }
        }

        handle.frame(now);

        if ((now - last.startedAt) / 1000 > CANVAS_DELAY) {
            canvasRef.current?.classList.add("on");
        }
    });

    // the ink still shows the spread veins once the drop has landed, or at once under reduced motion
    useTimelineFrame(({ changed }) => {
        if (changed && stillMode) {
            inkRef.current?.classList.toggle("on", reduced || runtime.impactAt !== null);
        }
    });

    return (
        <>
            {/* grounds: the colour under the plate, changed by wipes */}
            <section className="section grounds" aria-hidden="true">
                {/* ground layers */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container ground-0" ref={g0Ref} />
                        <div className="container ground-1" ref={g1Ref} />
                    </div>
                </div>
            </section>

            {/* plate: the bath, still poster first, the live shader fades over it */}
            <section
                className={stillMode ? "section stage still-mode" : "section stage"}
                aria-hidden="true"
                ref={stageRef}
            >
                {/* lifting sheet */}
                <div className="sub-section lift" ref={liftRef}>
                    <div className="placement">
                        <div className="container edge" ref={edgeRef} />
                    </div>
                    <div className="placement sheet" ref={sheetRef}>
                        <div className="container cam" ref={camRef}>
                            <picture>
                                <source media="(min-aspect-ratio: 1/1)" srcSet="/landing/still-land-grey.webp" />
                                <img src="/landing/still-port-grey.webp" alt="" fetchPriority="high" decoding="async" />
                            </picture>
                            {stillMode ? (
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
                            ) : null}
                        </div>
                        <div className="container">
                            {live ? <canvas className="bath-canvas" ref={canvasRef} /> : null}
                        </div>
                        <div className="container shade" />
                    </div>
                </div>
            </section>
        </>
    );
}
