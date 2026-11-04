// Section 5, the redaction. One sample note shows every detail its sender had: their name, the
// exact coordinates, a photo with its GPS tag and an open link. The frame stays pinned while
// four steps play: in each a black bar sweeps across one part, left to right, and the part
// settles into what the reader really gets, with a caption saying why. Then the bars turn into
// red lines and fade, and the closing line appears. Every value is a pure function of
// the scroll, so scrolling up plays it all backwards. Under reduced motion the card shows each
// part before and after, with all four captions.
import { useRef } from "react";
import { clamp, easeCubic, smoothstep } from "@/lib/landing/scenes";
import { useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

type Field = { was: string; now: string; step: number };
type Row = { label: string; fixed?: string; field?: Field };

const ROWS: Row[] = [
    { label: "From", field: { was: "Mika Reyes", now: "Someone", step: 0 } },
    {
        label: "Exact place",
        field: { was: "14.65371 N, 121.06874 E, Main Library east steps", now: "Main Library, about 150 m", step: 1 },
    },
    { label: "Photo", fixed: "IMG_2041.jpg", field: { was: "GPS 14.65371 N 121.06874 E", now: "", step: 2 } },
    { label: "Message", fixed: "saw you on the library steps. your laugh carried across the whole quad" },
    {
        label: "To",
        fixed: `${window.location.host}/maya`,
        field: { was: "Open, 1 h 58 m left", now: "Closed", step: 3 },
    },
];
const CAPTIONS = [
    "Nobody sees who sent it.",
    "Places are rounded to about 150 m.",
    "Photo location is removed before it reaches you.",
    "Your link takes notes only while a statement is up, two hours at a time.",
];
const SWEEP = 0.45;
const SETTLE = 0.55;
const LINE = 0.86;

type FieldEls = { was: HTMLElement; now: HTMLElement; bar: HTMLElement; red: HTMLElement };

// one field at step progress t and closing c: sweep in, settle to a line, turn red and go
function paintField(f: FieldEls, t: number, c: number) {
    const x = (easeCubic(clamp(t / SWEEP)) - 1) * 101;
    const y = 1 - LINE * easeCubic(clamp((t - SETTLE) / (1 - SETTLE)));
    const transform = `translate3d(${x.toFixed(2)}%,0,0) scaleY(${y.toFixed(4)})`;

    f.bar.style.transform = transform;
    f.red.style.transform = transform;
    f.bar.style.opacity = (1 - c).toFixed(3);
    f.red.style.opacity = (Math.min(1, 2 * c) * (1 - smoothstep(0.5, 1, c))).toFixed(3);
    f.was.style.opacity = (1 - smoothstep(0.38, 0.5, t)).toFixed(3);
    f.now.style.opacity = smoothstep(SETTLE, 0.8, t).toFixed(3);
}

export function Redaction() {
    const { reduced } = useLanding();
    const rootRef = useRef<HTMLElement>(null);
    const countRef = useRef<HTMLSpanElement>(null);
    const closingRef = useRef<HTMLDivElement>(null);
    const elsRef = useRef<{ fields: FieldEls[]; caps: HTMLElement[] } | null>(null);
    const lastRef = useRef({ p: -1, count: "", cap: -2 });

    useTimelineFrame(({ S, changed, relaid }) => {
        const root = rootRef.current;
        const last = lastRef.current;
        const r = S.redaction;

        if (reduced || !root || !changed || (S.p[6] === last.p && !relaid)) {
            return;
        }

        if (!elsRef.current) {
            elsRef.current = {
                fields: Array.from(root.querySelectorAll<HTMLElement>(".fld")).map((el) => ({
                    was: el.querySelector<HTMLElement>(".was") as HTMLElement,
                    now: el.querySelector<HTMLElement>(".now") as HTMLElement,
                    bar: el.querySelector<HTMLElement>(".bar.ink") as HTMLElement,
                    red: el.querySelector<HTMLElement>(".bar.red") as HTMLElement,
                })),
                caps: Array.from(root.querySelectorAll<HTMLElement>(".cap")),
            };
        }

        const { fields, caps } = elsRef.current;
        const count = `${r.step + 1} / ${CAPTIONS.length}`;
        const cap = r.t.reduce((shown, t, k) => (t >= 0.5 ? k : shown), -1);

        last.p = S.p[6];
        fields.forEach((f, k) => paintField(f, r.t[k], r.close));

        if (count !== last.count && countRef.current) {
            countRef.current.textContent = count;
            last.count = count;
        }

        if (cap !== last.cap) {
            caps.forEach((el, k) => el.classList.toggle("on", k === cap));
            last.cap = cap;
        }

        if (closingRef.current) {
            const c = smoothstep(0.3, 1, r.close);

            closingRef.current.style.opacity = c.toFixed(3);
            closingRef.current.style.transform = `translate3d(0,${((1 - c) * 16).toFixed(1)}px,0)`;
        }
    });

    return (
        <section className="section pinned redaction" id="redaction" data-pin="" aria-labelledby="h2-red" ref={rootRef}>
            {/* pinned frame */}
            <div className="sub-section frame">
                {/* heading, counter and captions */}
                <div className="placement red-head" data-calm="">
                    <div className="container">
                        <span className="num" ref={countRef}>
                            1 / {CAPTIONS.length}
                        </span>
                    </div>
                    <div className="container">
                        <h2 id="h2-red">Kept quiet on purpose</h2>
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
                    <div className="container closing" ref={closingRef}>
                        <p className="lede">Delete any note quietly. Drop is for everyone.</p>
                    </div>
                </div>

                {/* the sample note */}
                <div className="placement red-card" data-calm="">
                    <div className="container">
                        <dl className="msg">
                            {ROWS.map((row) => (
                                <div className="mrow" key={row.label}>
                                    <dt>{row.label}</dt>
                                    <dd>
                                        {row.fixed ? <span className="kept">{row.fixed}</span> : null}
                                        {row.field ? (
                                            <span className={row.fixed ? "fld tag" : "fld"}>
                                                <span className="was">{row.field.was}</span>
                                                <span className="now">{row.field.now}</span>
                                                <i className="bar ink" aria-hidden="true" />
                                                <i className="bar red" aria-hidden="true" />
                                            </span>
                                        ) : null}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </div>
        </section>
    );
}
