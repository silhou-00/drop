// Beat 05, "Answer in your story". The bath becomes a phone screen that crosses the page while
// three panels slide sideways on a track under it, each held for a moment. On wide screens the
// panels are clipped at the phone's edge so they appear to come out from behind it. Under
// reduced motion the track is a plain swipe row instead.
import { useRef, type CSSProperties } from "react";
import { useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

export function PhoneTrack() {
    const { reduced } = useLanding();
    const sectionRef = useRef<HTMLElement>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
    const stateRef = useRef({ widths: [] as number[], last: -1 });

    useTimelineFrame(({ L, S, changed, relaid }) => {
        const section = sectionRef.current;
        const track = trackRef.current;
        const state = stateRef.current;

        if (!section || !track || !changed) {
            return;
        }

        section.classList.toggle("gone", S.y > L.top[4] + 1);

        if (reduced) {
            return;
        }

        // panel positions on the track, and their widths for the clip
        if (relaid) {
            panelRefs.current.forEach((panel, i) => {
                if (panel) {
                    panel.style.left = `${L.panelX[i]}px`;
                }
            });
            state.widths = panelRefs.current.map((panel) => panel?.offsetWidth ?? 0);
            state.last = -1;
        }

        const x = -S.g * L.dist;

        if (Math.abs(x - state.last) < 0.1) {
            return;
        }

        state.last = x;
        track.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`;

        if (!L.wide) {
            return;
        }

        const edgeX = S.plate.x + S.plate.w + 20;

        for (let i = 1; i < panelRefs.current.length; i++) {
            const panel = panelRefs.current[i];

            if (!panel) {
                continue;
            }

            const cut = edgeX - (L.panelX[i] + x);
            let clip = `inset(-24px -24px -24px ${cut.toFixed(1)}px)`;

            if (cut <= 0) {
                clip = "";
            } else if (cut >= state.widths[i]) {
                clip = "inset(0 0 0 100%)";
            }

            panel.style.clipPath = clip;
        }
    });

    return (
        <section className="section beat hz" id="b5" aria-labelledby="h2-b5" ref={sectionRef}>
            {/* sticky frame */}
            <div className="sub-section frame">
                {/* horizontal track */}
                <div className="placement hz-track" ref={trackRef}>
                    <div
                        className="container panel p1"
                        ref={(el) => {
                            panelRefs.current[0] = el;
                        }}
                    >
                        <span className="num">05 / 07</span>
                        <h2 id="h2-b5" data-rise="">
                            <span className="ln">
                                <span className="li" style={{ "--n": 0 } as CSSProperties}>
                                    Answer{" "}
                                </span>
                            </span>
                            <span className="ln i1">
                                <span className="li" style={{ "--n": 1 } as CSSProperties}>
                                    in your story
                                </span>
                            </span>
                        </h2>
                    </div>
                    <div
                        className="container panel p2"
                        ref={(el) => {
                            panelRefs.current[1] = el;
                        }}
                    >
                        <h3>Turn it into a story card</h3>
                        <p className="copy">9:16, with the place on it.</p>
                    </div>
                    <div
                        className="container panel p3"
                        ref={(el) => {
                            panelRefs.current[2] = el;
                        }}
                    >
                        <h3>Post your answer</h3>
                        <p className="copy">The next notes come in through your link.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
