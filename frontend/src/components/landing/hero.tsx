// Section 1, the hero. On load the three headline lines rise through their masks, a red drop
// falls onto the red pin and the marble ripples out from where it lands. The copy and the calls
// to action sit below. The frame stays pinned for a while; as the page moves on, the headline
// lines lift out one after another. Under reduced motion the headline simply shows.
import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { clamp } from "@/lib/landing/scenes";
import { useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

const LINES = ["Anonymous ", "notes from ", "real places"];

export function Hero() {
    const { reduced, tokens, runtime, invalidate, openClaim, scrollToTarget } = useLanding();
    const headingRef = useRef<HTMLHeadingElement>(null);
    const dropRef = useRef<HTMLDivElement>(null);
    const linesRef = useRef<(HTMLSpanElement | null)[]>([]);
    const lastRef = useRef(-1);
    const { riseAt, dropAt, fall, impactFrac } = tokens.load;

    // the headline rises once on load
    useEffect(() => {
        const timer = window.setTimeout(() => {
            headingRef.current?.classList.add("in");
        }, riseAt);

        return () => {
            window.clearTimeout(timer);
        };
    }, [riseAt]);

    // the drop falls, and the ink starts where it lands
    useEffect(() => {
        if (reduced) {
            return;
        }

        const fallTimer = window.setTimeout(() => {
            dropRef.current?.classList.add("go");
        }, dropAt);
        const impactTimer = window.setTimeout(
            () => {
                runtime.impactAt = performance.now();
                invalidate();
            },
            dropAt + fall * impactFrac,
        );

        return () => {
            window.clearTimeout(fallTimer);
            window.clearTimeout(impactTimer);
        };
    }, [reduced, dropAt, fall, impactFrac, runtime, invalidate]);

    // the drop sits on the red pin; the lines lift out through the end of the pin
    useTimelineFrame(({ L, S, changed, relaid }) => {
        const drop = dropRef.current;
        const { from, lift, stagger } = tokens.exit;

        if (drop && relaid) {
            drop.style.transform = `translate3d(${L.baseS[0]}px,${L.baseS[1]}px,0)`;
        }

        if (reduced || !changed || (S.p[0] === lastRef.current && !relaid)) {
            return;
        }

        lastRef.current = S.p[0];
        linesRef.current.forEach((line, k) => {
            const e = clamp((S.p[0] - from - k * stagger) / (1 - from - 2 * stagger));

            if (line) {
                line.style.transform = e > 0 ? `translate3d(0,${(-e * lift * L.H).toFixed(1)}px,0)` : "";
                line.style.opacity = e > 0 ? (1 - e).toFixed(3) : "";
            }
        });
    });

    return (
        <section className="section pinned hero" id="top" data-pin="" aria-labelledby="h1-top">
            {/* pinned frame */}
            <div className="sub-section frame">
                {/* headline, three lines, three alignments */}
                <div className="placement head" data-calm="">
                    <div className="container">
                        <h1 id="h1-top" ref={headingRef} className={reduced ? "in" : undefined}>
                            {LINES.map((text, k) => (
                                <span
                                    className={`ln l${k + 1}`}
                                    key={text}
                                    ref={(el) => {
                                        linesRef.current[k] = el;
                                    }}
                                >
                                    <span className="li" style={{ "--n": k } as CSSProperties}>
                                        {text}
                                    </span>
                                </span>
                            ))}
                        </h1>
                    </div>
                </div>

                {/* lede and calls to action */}
                <div className="placement side" data-calm="">
                    <div className="container">
                        <p className="lede">
                            Post your link. Friends send a note with a place and a photo. You guess who.
                        </p>
                    </div>
                    <div className="cta-row">
                        <div className="container">
                            <a
                                className="btn btn-ink"
                                href="#claim-band"
                                onClick={(event) => {
                                    event.preventDefault();
                                    openClaim(event.currentTarget);
                                }}
                            >
                                Claim your link
                                <span className="dot">
                                    <ArrowRight weight="bold" aria-hidden="true" />
                                </span>
                            </a>
                        </div>
                        <div className="container">
                            <a
                                className="text-link"
                                href="#b2"
                                onClick={(event) => {
                                    event.preventDefault();
                                    scrollToTarget("#b2");
                                }}
                            >
                                See how it works
                            </a>
                        </div>
                    </div>
                </div>

                {/* the falling drop, on the red pin */}
                <div className="placement drop-place" aria-hidden="true">
                    <div className="container drop" ref={dropRef}>
                        <i>
                            <svg viewBox="0 0 30 40">
                                <path
                                    d="M15 1C15 1 3 17 3 26a12 12 0 0 0 24 0C27 17 15 1 15 1Z"
                                    fill="var(--accent-fill)"
                                />
                                <ellipse cx="10.5" cy="25" rx="3" ry="5" fill="#fff" opacity=".45" />
                            </svg>
                        </i>
                    </div>
                </div>
            </div>
        </section>
    );
}
