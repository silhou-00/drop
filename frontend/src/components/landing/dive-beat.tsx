// Beat 03, "Someone finds it". The camera dives into the red pin on the full-bleed street map;
// a dashed line cuts a note out of the bath, which peels up like paper, turns white and shows
// the message. The same note then rides into beat 04, inside the lens, its sender scrambling
// and never resolving, and fades as the lens opens back to the full bath. That travelling
// note, its hole, the cut line and the "Guess who?" bubble live in the scene layer, so they
// are exported separately as NoteScene.
import { useEffect, useRef, type CSSProperties } from "react";
import { noteCentre, scrambleText, smoothstep, randomGlyphs } from "@/lib/landing/scenes";
import { useExitGroup, useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

const WHO = "someone";
const PLACE = "Main Library, about 150 m";
const AGO = "48 min ago";

// the beat copy
export function DiveBeat() {
    const sectionRef = useRef<HTMLElement>(null);

    useExitGroup(1, () => {
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

    return (
        <section className="section beat" id="b3" aria-labelledby="h2-b3" ref={sectionRef}>
            {/* sticky frame */}
            <div className="sub-section frame">
                {/* heading on the bath, phones and tablets */}
                <div className="placement top-l">
                    <div className="container veil">
                        <span className="num">03 / 08</span>
                    </div>
                    <div className="container veil">
                        <h2 data-rise="">
                            <span className="ln">
                                <span className="li" style={{ "--n": 0 } as CSSProperties}>
                                    Someone{" "}
                                </span>
                            </span>
                            <span className="ln i2">
                                <span className="li" style={{ "--n": 1 } as CSSProperties}>
                                    finds it
                                </span>
                            </span>
                        </h2>
                    </div>
                </div>

                {/* heading and copy, bottom */}
                <div className="placement bot-r veil">
                    <div className="container h-wide">
                        <span className="num">03 / 08</span>
                    </div>
                    <div className="container h-wide">
                        <h2 id="h2-b3" className="mega" data-rise="">
                            <span className="ln">
                                <span className="li" style={{ "--n": 0 } as CSSProperties}>
                                    Someone{" "}
                                </span>
                            </span>
                            <span className="ln i2">
                                <span className="li" style={{ "--n": 1 } as CSSProperties}>
                                    finds it
                                </span>
                            </span>
                        </h2>
                    </div>
                    <div className="container">
                        <p className="copy" data-fade="">
                            Friends open your link and drop a note, up to 280 characters.
                            <span className="more">
                                {" "}
                                A photo if they like. It lifts off the map and lands in your inbox.
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// the travelling note and its props, in the scene layer
export function NoteScene() {
    const { reduced, tokens, invalidate } = useLanding();
    const holeRef = useRef<HTMLDivElement>(null);
    const cutRef = useRef<SVGSVGElement>(null);
    const cutRectRef = useRef<SVGRectElement>(null);
    const cardRef = useRef<HTMLDivElement>(null);
    const frontRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const paperRef = useRef<HTMLDivElement>(null);
    const noteRef = useRef<HTMLDivElement>(null);
    const placeRef = useRef<HTMLSpanElement>(null);
    const agoRef = useRef<HTMLSpanElement>(null);
    const whoRef = useRef<HTMLSpanElement>(null);
    const guessRef = useRef<HTMLDivElement>(null);
    const scrambleRef = useRef({ on: false, timer: 0, guess: false });

    // the sender scrambles; the place and time lock left to right, the name never does
    function startScramble() {
        const scramble = scrambleRef.current;

        scramble.on = true;
        cardRef.current?.classList.add("scr-on");

        if (reduced) {
            return;
        }

        const startedAt = performance.now();

        window.clearInterval(scramble.timer);
        scramble.timer = window.setInterval(() => {
            const elapsed = performance.now() - startedAt;

            if (placeRef.current) {
                placeRef.current.textContent = scrambleText(PLACE, elapsed, tokens);
            }

            if (agoRef.current) {
                agoRef.current.textContent = scrambleText(AGO, elapsed, tokens);
            }

            if (whoRef.current && Math.floor(elapsed / tokens.scramble.tick) % 3 === 0) {
                whoRef.current.textContent = randomGlyphs(WHO.length);
            }
        }, tokens.scramble.tick);
    }

    function stopScramble() {
        const scramble = scrambleRef.current;

        scramble.on = false;
        window.clearInterval(scramble.timer);
        cardRef.current?.classList.remove("scr-on");

        if (placeRef.current && agoRef.current && whoRef.current) {
            placeRef.current.textContent = PLACE;
            agoRef.current.textContent = AGO;
            whoRef.current.textContent = WHO;
        }
    }

    useEffect(() => {
        const scramble = scrambleRef.current;

        invalidate();

        return () => {
            window.clearInterval(scramble.timer);
        };
    }, [invalidate]);

    useTimelineFrame(({ L, S, changed, relaid }) => {
        const hole = holeRef.current;
        const cut = cutRef.current;
        const cutRect = cutRectRef.current;
        const card = cardRef.current;
        const front = frontRef.current;
        const print = printRef.current;
        const paper = paperRef.current;
        const note = noteRef.current;
        const guess = guessRef.current;

        if (!hole || !cut || !cutRect || !card || !front || !print || !paper || !note || !guess) {
            return;
        }

        const [nw, nh] = L.note;

        // sizes that change only on layout; the print is the combed bath under the pin
        if (relaid) {
            const sc = L.frame.cover * L.K.b3.z;

            hole.style.width = `${nw}px`;
            hole.style.height = `${nh}px`;
            cut.style.width = `${nw}px`;
            cut.style.height = `${nh}px`;
            cut.setAttribute("viewBox", `0 0 ${nw} ${nh}`);
            cutRect.setAttribute("width", String(nw - 2));
            cutRect.setAttribute("height", String(nh - 2));
            card.style.width = `${nw}px`;
            card.style.height = `${nh}px`;
            front.style.cssText = `width:${nw}px;height:${nh}px;left:0;top:0`;
            print.style.backgroundImage = `url(/landing/still-${L.frame.key}-comb.webp)`;
            print.style.backgroundSize = `${L.frame.w * sc}px ${L.frame.h * sc}px`;
            print.style.backgroundPosition = `${nw / 2 - L.red.q[0] * sc}px ${nh / 2 - L.red.q[1] * sc}px`;
        }

        if (!changed) {
            return;
        }

        const p = S.plate;
        const cutDone = smoothstep(tokens.card.cut[0], tokens.card.cut[1], S.h3);
        const u = smoothstep(tokens.card.lift[0], tokens.card.lift[1], S.h3);
        const hs = p.z / L.K.b3.z;
        const show = S.h3 > 0.005 && S.frame < 1;

        // 03 cut line and the hole left in the bath
        cut.style.opacity = String(S.h3 > 0.005 && u < 0.35 && S.lens === 0 ? 1 - smoothstep(0.15, 0.35, u) : 0);
        cut.style.setProperty("--cut", String(1 - cutDone));
        cut.style.transform = `translate3d(${p.sx - nw / 2}px,${p.sy - nh / 2}px,0)`;
        hole.style.opacity = (smoothstep(0.28, 0.45, S.h3) * (1 - smoothstep(0, 0.6, S.lens)) * 0.9).toFixed(3);
        hole.style.transform = `translate3d(${p.sx - (nw * hs) / 2}px,${p.sy - (nh * hs) / 2}px,0) scale(${hs.toFixed(4)})`;
        card.style.visibility = show ? "visible" : "hidden";

        if (show) {
            const c = noteCentre(p, L.K, L.card3, { u, lens: S.lens });
            const sc = 1 - tokens.card.shrink * u;
            const lift = Math.sin(Math.PI * u) * (1 - S.lens);

            card.style.opacity = (1 - S.frame).toFixed(3);
            card.style.transform = `translate3d(${(c[0] - nw / 2).toFixed(1)}px,${(c[1] - nh / 2).toFixed(1)}px,0) scale(${sc.toFixed(4)})`;
            front.style.transform = `rotate3d(1,-1,0,${(-tokens.card.peelDeg * lift).toFixed(2)}deg)`;
            front.style.boxShadow = `0 ${6 + 34 * lift}px ${14 + 52 * lift}px rgba(10,10,10,${((0.1 + 0.16 * lift) * smoothstep(0.02, 0.2, u)).toFixed(3)})`;
            print.style.opacity = String(1 - 0.82 * smoothstep(0.3, 0.9, u));
            paper.style.opacity = String(smoothstep(0.3, 0.9, u) * 0.94);
            note.style.opacity = String(smoothstep(0.55, 1, u));
            // 04 guess bubble, top right of the note
            guess.style.transform = `translate3d(${(c[0] + nw * 0.36).toFixed(1)}px,${(c[1] - nh * 0.62).toFixed(1)}px,0)`;
        }

        // 04 the sender scrambles and never resolves; the bubble asks
        const scramble = scrambleRef.current;
        const scrambling = S.lens > 0.5 && S.frame < 0.5;
        const guessing = S.lens >= 1 && S.h4 > 0.1 && S.frame < 0.1;

        if (scrambling && !scramble.on) {
            startScramble();
        }

        if (!scrambling && scramble.on) {
            stopScramble();
        }

        if (guessing !== scramble.guess) {
            scramble.guess = guessing;
            guess.classList.toggle("on", guessing);
        }
    });

    return (
        <div className="placement">
            <div className="container obj hole" ref={holeRef} />
            <svg className="container obj cut" ref={cutRef} aria-hidden="true">
                <rect x="1" y="1" rx="13" pathLength="1" ref={cutRectRef} />
            </svg>
            <div className="container obj card" ref={cardRef}>
                <div className="face front" ref={frontRef}>
                    <div className="print" ref={printRef} />
                    <div className="paper" ref={paperRef} />
                    <div className="note" ref={noteRef}>
                        <div className="n-top">
                            <span className="n-pin" />
                            <span ref={placeRef}>{PLACE}</span>
                        </div>
                        <p className="n-msg">
                            the one who leaves sticky notes in the third floor carrels. it was me. it was always me
                        </p>
                        <div className="n-from">
                            <span>
                                from{" "}
                                <span className="who" ref={whoRef}>
                                    {WHO}
                                </span>
                            </span>
                            <span ref={agoRef}>{AGO}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="container obj guess" ref={guessRef}>
                <span>Guess who?</span>
            </div>
        </div>
    );
}
