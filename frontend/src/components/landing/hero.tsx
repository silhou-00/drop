// Beat 01, the hero. On load the three headline lines rise through their masks, a red drop
// falls into its own region of the bath and the veins rush out from where it lands, with a
// small "about 150 m" tag beside it. The copy and the call to action sit off axis below. As
// the page scrolls, the headline lines and the side copy slide off to alternating sides.
// The drop and the tag live in the landing's scene layer, so they are exported separately.
import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useExitGroup, useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

// the hero copy
export function Hero() {
    const { reduced, tokens, openClaim, scrollToTarget } = useLanding();
    const sectionRef = useRef<HTMLElement>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const riseAt = tokens.load.riseAt;

    useExitGroup(0, () => Array.from(sectionRef.current?.querySelectorAll<HTMLElement>("h1 .ln") ?? []));
    useExitGroup(1, () => Array.from(sectionRef.current?.querySelectorAll<HTMLElement>(".side > .container") ?? []));

    // the headline rises once on load
    useEffect(() => {
        const timer = window.setTimeout(() => {
            headingRef.current?.classList.add("in");
        }, riseAt);

        return () => {
            window.clearTimeout(timer);
        };
    }, [riseAt]);

    return (
        <section className="section hero" id="top" ref={sectionRef}>
            {/* hero layout */}
            <div className="sub-section">
                {/* corner meta */}
                <div className="placement meta-top">
                    <div className="container">
                        <span className="meta">14.656° N, 121.066° E</span>
                    </div>
                    <div className="container num-c">
                        <span className="num">01 / 07</span>
                    </div>
                    <div className="container chip-c">
                        <span className="chip">
                            <i />
                            Pinned to a place, never to a person
                        </span>
                    </div>
                </div>

                {/* headline, three lines, three alignments */}
                <div className="placement head">
                    <div className="container">
                        <h1 ref={headingRef} className={reduced ? "in" : undefined}>
                            <span className="ln l1">
                                <span className="li" style={{ "--n": 0 } as CSSProperties}>
                                    Anonymous{" "}
                                </span>
                            </span>
                            <span className="ln l2">
                                <span className="li" style={{ "--n": 1 } as CSSProperties}>
                                    notes from{" "}
                                </span>
                            </span>
                            <span className="ln l3">
                                <span className="li" style={{ "--n": 2 } as CSSProperties}>
                                    real places
                                </span>
                            </span>
                        </h1>
                    </div>
                </div>

                {/* lede and call to action, off axis */}
                <div className="placement side">
                    <div className="container veil">
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
                                Watch a drop land
                            </a>
                        </div>
                    </div>
                    <div className="container">
                        <p className="fine">Free, for people 18 and over.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// the falling drop and its distance tag, in the scene layer
export function HeroScene() {
    const { reduced, tokens, runtime, invalidate } = useLanding();
    const dropRef = useRef<HTMLDivElement>(null);
    const tagRef = useRef<HTMLDivElement>(null);
    const { dropAt, fall, impactFrac } = tokens.load;

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

    useTimelineFrame(({ L, S, changed, relaid }) => {
        const drop = dropRef.current;
        const tag = tagRef.current;

        if (!drop || !tag) {
            return;
        }

        if (relaid) {
            const at = `translate3d(${L.baseS[0]}px,${L.baseS[1]}px,0)`;

            drop.style.transform = at;
            tag.style.transform = at;
        }

        if (changed) {
            tag.classList.toggle("on", runtime.impactAt !== null && S.hero < 0.25);
        }
    });

    return (
        <div className="placement">
            <div className="container obj drop" ref={dropRef}>
                <i>
                    <svg viewBox="0 0 30 40" aria-hidden="true">
                        <path d="M15 1C15 1 3 17 3 26a12 12 0 0 0 24 0C27 17 15 1 15 1Z" fill="var(--accent-fill)" />
                        <ellipse cx="10.5" cy="25" rx="3" ry="5" fill="#fff" opacity=".45" />
                    </svg>
                </i>
            </div>
            <div className="container obj tag" ref={tagRef}>
                <span>about 150 m</span>
            </div>
        </div>
    );
}
