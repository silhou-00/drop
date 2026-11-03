// Section 4, "Your answer". The frame pins for about four screens and plays a reply thread with
// the scroll. A glass panel first grows from a centred card to the whole screen, then a note
// rises in, your reply types itself one letter at a time, a chip says it went up as a story with
// your link, and new notes stack in through that link, each with a soft ping. The counter and
// the caption change together at each of the four steps. Every value is a pure function of the
// scroll, so scrolling up plays it all backwards. The reply's full text sits underneath, unseen,
// so the bubble keeps its size while it types, and screen readers get the whole line at once.
// Under reduced motion nothing pins: the finished thread shows with every caption as a list.
import { useRef } from "react";
import { clamp, easeCubic, easeIO, smoothstep } from "@/lib/landing/scenes";
import { useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

const NOTE = "the one who leaves sticky notes in the third floor carrels";
const REPLY = "ok who else sits in the carrels";
const INCOMING = ["New note, Gate 2", "New note, Cafeteria", "New note, Main Library"];
const CAPTIONS = [
    "A note arrives.",
    "Answer it in your own words.",
    "It goes up as a story, with your link.",
    "The next notes come in through your link.",
];
const CARD_W = 720;
const CARD_MAX = 0.92;
const CARD_H = 0.78;
const RADIUS = 28;
const RISE = 40;
const LIFT = 16;

type ThreadEls = { note: HTMLElement; out: HTMLElement; chip: HTMLElement; news: HTMLElement[]; pings: HTMLElement[] };

// the panel: a centred card at g = 0, the full screen at g = 1
function paintGlass(el: HTMLElement, g: number, W: number) {
    const sx0 = Math.min(CARD_MAX, CARD_W / W);
    const sx = sx0 + (1 - sx0) * g;
    const sy = CARD_H + (1 - CARD_H) * g;
    const r = RADIUS * (1 - g);

    el.style.transform = `scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
    el.style.borderRadius = `${(r / sx).toFixed(2)}px / ${(r / sy).toFixed(2)}px`;
}

// one bubble rising into its reserved place
function paintRise(el: HTMLElement, t: number, dist: number) {
    const e = easeCubic(clamp(t));

    el.style.opacity = e.toFixed(3);
    el.style.transform = `translate3d(0,${((1 - e) * dist).toFixed(1)}px,0)`;
}

// the ping ring: swells out from the bubble and fades
function paintPing(el: HTMLElement, t: number) {
    el.style.opacity = (smoothstep(0, 0.2, t) * (1 - smoothstep(0.35, 1, t))).toFixed(3);
    el.style.transform = `scale(${(1 + 0.25 * t).toFixed(4)})`;
}

export function YourAnswer() {
    const { reduced } = useLanding();
    const rootRef = useRef<HTMLElement>(null);
    const glassRef = useRef<HTMLDivElement>(null);
    const headRef = useRef<HTMLDivElement>(null);
    const liftRef = useRef<HTMLDivElement>(null);
    const countRef = useRef<HTMLSpanElement>(null);
    const typedRef = useRef<HTMLSpanElement>(null);
    const elsRef = useRef<{ caps: HTMLElement[]; thread: ThreadEls } | null>(null);
    const lastRef = useRef({ p: -1, grow: -1, note: -1, chars: -1, posted: -1, incoming: [-1, -1, -1], step: -1 });

    useTimelineFrame(({ L, S, changed, relaid }) => {
        const root = rootRef.current;
        const last = lastRef.current;
        const a = S.answer;

        if (reduced || !root || !changed || (S.p[5] === last.p && !relaid)) {
            return;
        }

        if (!elsRef.current) {
            elsRef.current = {
                caps: Array.from(root.querySelectorAll<HTMLElement>(".cap")),
                thread: {
                    note: root.querySelector<HTMLElement>(".ans-note") as HTMLElement,
                    out: root.querySelector<HTMLElement>(".ans-out") as HTMLElement,
                    chip: root.querySelector<HTMLElement>(".ans-chip") as HTMLElement,
                    news: Array.from(root.querySelectorAll<HTMLElement>(".ans-new")),
                    pings: Array.from(root.querySelectorAll<HTMLElement>(".ans-ping")),
                },
            };
        }

        const { caps, thread } = elsRef.current;
        const chars = Math.round(a.typed * REPLY.length);

        last.p = S.p[5];

        if (relaid) {
            last.grow = -1;
        }

        // grow: the panel opens to the screen, the heading fades in
        if (a.grow !== last.grow && glassRef.current && headRef.current) {
            const g = easeIO(a.grow);

            paintGlass(glassRef.current, g, L.W);
            headRef.current.style.opacity = g.toFixed(3);
            last.grow = a.grow;
        }

        if (a.note !== last.note) {
            paintRise(thread.note, a.note, RISE);
            last.note = a.note;
        }

        // typed: the bubble shows once typing starts and fills one letter at a time
        if (chars !== last.chars && typedRef.current) {
            typedRef.current.textContent = REPLY.slice(0, chars);
            thread.out.style.opacity = chars > 0 ? "1" : "0";
            last.chars = chars;
        }

        // posted: the chip slides in and the heading and thread lift a little
        if (a.posted !== last.posted && liftRef.current && headRef.current) {
            const e = easeCubic(a.posted);
            const lift = `translate3d(0,${(-e * LIFT).toFixed(1)}px,0)`;

            thread.chip.style.opacity = e.toFixed(3);
            thread.chip.style.transform = `translate3d(${((1 - e) * 24).toFixed(1)}px,0,0)`;
            liftRef.current.style.transform = lift;
            headRef.current.style.transform = lift;
            last.posted = a.posted;
        }

        a.incoming.forEach((t, k) => {
            if (t !== last.incoming[k]) {
                paintRise(thread.news[k], t / 0.5, RISE / 2);
                paintPing(thread.pings[k], t);
                last.incoming[k] = t;
            }
        });

        if (a.step !== last.step) {
            caps.forEach((el, k) => el.classList.toggle("on", k === a.step));

            if (countRef.current) {
                countRef.current.textContent = `${a.step + 1} / ${CAPTIONS.length}`;
            }

            last.step = a.step;
        }
    });

    return (
        <section className="section pinned answer" id="answer" data-pin="" aria-labelledby="h2-ans" ref={rootRef}>
            {/* pinned frame */}
            <div className="sub-section frame">
                {/* the glass panel that grows to the full screen */}
                <div className="placement ans-bg" aria-hidden="true">
                    <div className="container ans-glass" ref={glassRef} />
                </div>

                {/* heading, counter and captions */}
                <div className="placement ans-head" data-calm="" ref={headRef}>
                    <div className="container">
                        <span className="num" ref={countRef}>
                            1 / {CAPTIONS.length}
                        </span>
                    </div>
                    <div className="container">
                        <h2 id="h2-ans">Answer in your story</h2>
                    </div>
                    <div className="container">
                        <div className="caps">
                            {CAPTIONS.map((text, k) => (
                                <p className="cap" key={k}>
                                    {text}
                                </p>
                            ))}
                        </div>
                    </div>
                </div>

                {/* the reply thread */}
                <div className="placement ans-thread" data-calm="">
                    {/* lift wrapper: moves the whole thread up when the chip arrives */}
                    <div className="ans-lift" ref={liftRef}>
                        <div className="container ans-note">
                            <div className="abub in">
                                <p>{NOTE}</p>
                                <span className="ans-tag">Main Library</span>
                            </div>
                        </div>
                        <div className="container ans-out">
                            <div className="abub out">
                                <p className="ans-reply">
                                    <span className="sr-only">{REPLY}</span>
                                    <span className="ans-ghost" aria-hidden="true">
                                        {REPLY}
                                    </span>
                                    <span className="ans-typed" aria-hidden="true" ref={typedRef} />
                                </p>
                            </div>
                        </div>
                        <div className="container ans-chip">
                            <p className="ans-posted">Posted to your story · drop.link/maya</p>
                        </div>
                        {INCOMING.map((text) => (
                            <div className="container ans-new" key={text}>
                                <div className="abub small">
                                    <i className="ans-ping" aria-hidden="true" />
                                    <p>{text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
