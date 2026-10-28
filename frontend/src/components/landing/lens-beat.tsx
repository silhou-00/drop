// Beat 04, "Guess who". The ground turns dark and the bath closes to a round lens around the
// note. The large "from someone" line scrambles while the lens is open and never resolves,
// because nothing in Drop shows who wrote a note. Screen readers get the plain words.
import { useEffect, useRef, type CSSProperties } from "react";
import { randomGlyphs } from "@/lib/landing/scenes";
import { useExitGroup, useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

const WHO = "someone";

export function LensBeat() {
    const { reduced, tokens } = useLanding();
    const sectionRef = useRef<HTMLElement>(null);
    const whoRef = useRef<HTMLElement>(null);
    const scrambleRef = useRef({ on: false, timer: 0 });

    useExitGroup(4, () => {
        const section = sectionRef.current;

        if (!section) {
            return [];
        }

        const lines = Array.from(section.querySelectorAll<HTMLElement>("h2 .ln"));
        const copy = Array.from(section.querySelectorAll<HTMLElement>(".frame .container")).filter(
            (container) => !container.querySelector("h2"),
        );

        return [...lines, ...copy];
    });

    useEffect(() => {
        const scramble = scrambleRef.current;

        return () => {
            window.clearInterval(scramble.timer);
        };
    }, []);

    // the name cycles while the lens is open
    useTimelineFrame(({ S, changed }) => {
        const scramble = scrambleRef.current;
        const scrambling = S.lens > 0.5 && S.frame < 0.5;

        if (!changed || scrambling === scramble.on) {
            return;
        }

        scramble.on = scrambling;
        window.clearInterval(scramble.timer);

        if (!scrambling) {
            if (whoRef.current) {
                whoRef.current.textContent = WHO;
            }

            return;
        }

        if (reduced) {
            return;
        }

        const startedAt = performance.now();

        scramble.timer = window.setInterval(() => {
            const elapsed = performance.now() - startedAt;

            if (whoRef.current && Math.floor(elapsed / tokens.scramble.tick) % 3 === 0) {
                whoRef.current.textContent = randomGlyphs(WHO.length);
            }
        }, tokens.scramble.tick);
    });

    return (
        <section className="section beat" id="b4" aria-labelledby="h2-b4" ref={sectionRef}>
            {/* sticky frame on dark */}
            <div className="sub-section frame on-dark">
                {/* heading and copy */}
                <div className="placement copy-l">
                    <div className="container">
                        <span className="num">04 / 07</span>
                    </div>
                    <div className="container">
                        <h2 id="h2-b4" className="mega" data-rise="">
                            <span className="ln">
                                <span className="li" style={{ "--n": 0 } as CSSProperties}>
                                    Guess{" "}
                                </span>
                            </span>
                            <span className="ln i2">
                                <span className="li" style={{ "--n": 1 } as CSSProperties}>
                                    who
                                </span>
                            </span>
                        </h2>
                    </div>
                    <div className="container">
                        <p className="scr-big" aria-label="from someone">
                            <span aria-hidden="true">
                                from <b ref={whoRef}>{WHO}</b>
                            </span>
                        </p>
                    </div>
                    <div className="container">
                        <p className="copy" data-fade="">
                            No account, no name. Nothing shows who wrote it.
                            <span className="more">
                                {" "}
                                Not to you, not to anyone. You get the words and the place. The rest is guessing.
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
