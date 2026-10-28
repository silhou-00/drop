// Beat 06, "Kept quiet on purpose". The heading stays put while an index of five safety facts
// steps through the pinned frame, one open at a time with a red tick under it. Beside the index
// (above it on phones) the bath acts out the open fact in its window: an 18+ stamp, the 150 m
// ring drawn to the map's scale, a note deleted by a silent block, a reported note, and a
// photo whose location is struck out. Then the bath floods back to full screen and the index
// slides away. The acted scenes live in the scene layer, so they are exported separately.
import { useRef, type CSSProperties } from "react";
import { ringRadius, toScreen } from "@/lib/landing/scenes";
import { keptQuietOpacity } from "@/lib/landing/timeline";
import { useExitGroup, useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

const FACTS = [
    { title: "Adults only", detail: "Drop is for people 18 and over." },
    { title: "Areas, not spots", detail: "Places are rounded to about 150 m." },
    { title: "Silent block", detail: "Blocking deletes the note. Nobody is told." },
    { title: "Moderated", detail: "Reports go to moderators." },
    { title: "No photo location", detail: "Location data is removed from every photo." },
];
const PHOTO_ZOOM = 1.6;

// the heading and the index of facts
export function KeptQuiet() {
    const { reduced } = useLanding();
    const sectionRef = useRef<HTMLElement>(null);
    const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
    const lastRef = useRef({ kq: -1, top: "" });

    useExitGroup(5, () => {
        const section = sectionRef.current;

        if (!section) {
            return [];
        }

        const lines = Array.from(section.querySelectorAll<HTMLElement>("h2 .ln"));
        const num = section.querySelector<HTMLElement>(".num")?.parentElement;
        const rows = rowRefs.current.filter((row): row is HTMLDivElement => row !== null);

        return num ? [...lines, num, ...rows] : [...lines, ...rows];
    });

    useTimelineFrame(({ L, S, changed }) => {
        const section = sectionRef.current;
        const last = lastRef.current;

        if (!section || !changed) {
            return;
        }

        const top = L.kqTop === null ? "" : `${L.kqTop}px`;

        if (top !== last.top) {
            section.style.setProperty("--kq-top", top || null);
            last.top = top;
        }

        // 06 drops its dark sheet once it has covered 05; the ground is dark under it from here
        section.classList.toggle("clear", S.y > L.top[4] + 1);
        section.classList.toggle("gone", S.y > (reduced ? L.c.mid : L.c.F1));

        if (S.kq !== last.kq) {
            last.kq = S.kq;
            rowRefs.current.forEach((row, i) => row?.classList.toggle("on", i === S.kq));
        }
    });

    return (
        <section className="section beat kq" id="b6" aria-labelledby="h2-b6" ref={sectionRef}>
            {/* sticky frame on dark */}
            <div className="sub-section frame on-dark">
                {/* heading, never covered */}
                <div className="placement head-l">
                    <div className="container">
                        <span className="num">06 / 07</span>
                    </div>
                    <div className="container">
                        <h2 id="h2-b6" data-rise="">
                            <span className="ln">
                                <span className="li" style={{ "--n": 0 } as CSSProperties}>
                                    Kept quiet{" "}
                                </span>
                            </span>
                            <span className="ln i1">
                                <span className="li" style={{ "--n": 1 } as CSSProperties}>
                                    on purpose
                                </span>
                            </span>
                        </h2>
                    </div>
                </div>

                {/* the index */}
                <div className="placement kq-list">
                    {FACTS.map((fact, i) => (
                        <div
                            key={fact.title}
                            className="container kq-row"
                            ref={(el) => {
                                rowRefs.current[i] = el;
                            }}
                        >
                            <span className="k">{String(i + 1).padStart(2, "0")}</span>
                            <b>{fact.title}</b>
                            <span className="d">{fact.detail}</span>
                            <i className="tick" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// one acted state per fact, clipped to the plate, in the scene layer
export function KeptQuietScene() {
    const { reduced, tokens } = useLanding();
    const boxRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const photoRef = useRef<HTMLDivElement>(null);
    const stateRefs = useRef<(HTMLDivElement | null)[]>([]);
    const lastRef = useRef({ kq: -1, act: "", box: "", opacity: "", ring: "" });

    useTimelineFrame(({ L, S, changed, relaid }) => {
        const box = boxRef.current;
        const ring = ringRef.current;
        const photo = photoRef.current;
        const last = lastRef.current;

        if (!box || !ring || !photo) {
            return;
        }

        // 06 photo: the bath under the pin, as the photo whose location gets stripped
        if (relaid) {
            const sc = L.frame.cover * PHOTO_ZOOM;
            const pw = photo.offsetWidth || 300;
            const ph = photo.offsetHeight || 225;

            photo.style.backgroundImage = `url(/landing/still-${L.frame.key}-comb.webp)`;
            photo.style.backgroundSize = `${L.frame.w * sc}px ${L.frame.h * sc}px`;
            photo.style.backgroundPosition = `${pw / 2 - L.red.q[0] * sc}px ${ph / 2 - L.red.q[1] * sc}px`;
        }

        if (!changed) {
            return;
        }

        const p = S.plate;
        const on = S.y > L.top[4] + 1 && S.y < L.c.F1;
        const opacity = (reduced && on ? 1 : keptQuietOpacity(S.y, L, tokens)).toFixed(2);

        if (opacity !== last.opacity) {
            box.style.opacity = opacity;
            last.opacity = opacity;
        }

        // the window only changes during the slot and the flood; the pin moves with every camera move
        if (on && opacity !== "0.00") {
            const rect = [p.x, p.y, p.w, p.h, p.r].map((v) => v.toFixed(1)).join("|");

            if (rect !== last.box) {
                last.box = rect;
                box.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0)`;
                box.style.width = `${p.w.toFixed(1)}px`;
                box.style.height = `${p.h.toFixed(1)}px`;
                box.style.borderRadius = `${p.r.toFixed(1)}px`;
                box.style.setProperty(
                    "--st",
                    `${Math.min(tokens.kq.stamp[1], tokens.kq.stamp[0] * Math.min(p.w, p.h)).toFixed(1)}px`,
                );
            }

            if (S.kq === 1 || last.kq === 1) {
                const pin = toScreen(L.red.q, p, L.red.q, L.frame.cover);
                const values = [pin[0] - p.x, pin[1] - p.y, ringRadius(L.frame, p)].map((v) => `${v.toFixed(1)}px`);
                const key = values.join("|");

                if (key !== last.ring) {
                    last.ring = key;
                    ring.style.setProperty("--px", values[0]);
                    ring.style.setProperty("--py", values[1]);
                    ring.style.setProperty("--rr", values[2]);
                }
            }
        }

        if (S.kq !== last.kq) {
            last.kq = S.kq;
            stateRefs.current.forEach((state, i) => state?.classList.toggle("on", i === S.kq));
        }

        const act = reduced || S.kqU > tokens.kq.act;
        const actKey = `${S.kq}:${act}`;

        if (actKey !== last.act) {
            last.act = actKey;
            stateRefs.current.forEach((state, i) => state?.classList.toggle("act", i === S.kq && act));
        }
    });

    function stateRef(i: number) {
        return (el: HTMLDivElement | null) => {
            stateRefs.current[i] = el;
        };
    }

    return (
        <div className="placement">
            <div className="container obj kq-plate" ref={boxRef}>
                <div className="kq-s s0" ref={stateRef(0)}>
                    <div className="stamp">
                        <b>18+</b>
                        <span>adults only</span>
                    </div>
                </div>
                <div
                    className="kq-s s1"
                    ref={(el) => {
                        stateRefs.current[1] = el;
                        ringRef.current = el;
                    }}
                >
                    <i className="ring" />
                    <i className="exact" />
                    <i className="kpin" />
                    <span className="kchip">Main Library, about 150 m</span>
                </div>
                <div className="kq-s s2" ref={stateRef(2)}>
                    <div className="kwrap">
                        <i className="hole" />
                        <div className="knote">
                            <div className="n-top">
                                <span className="n-pin" />
                                <span>Gate 2, about 150 m</span>
                            </div>
                            <p>saw you at the jeep stop again. nice jacket</p>
                            <div className="n-from">
                                <span>from someone</span>
                                <span>2 h ago</span>
                            </div>
                        </div>
                    </div>
                    <span className="kchip ink">Deleted. Nobody is told.</span>
                </div>
                <div className="kq-s s3" ref={stateRef(3)}>
                    <div className="knote">
                        <div className="n-top">
                            <span className="n-pin" />
                            <span>Main Library, about 150 m</span>
                        </div>
                        <p>you talk way too loud in the quiet room</p>
                        <div className="n-from">
                            <span>from someone</span>
                            <span>5 min ago</span>
                        </div>
                    </div>
                    <span className="flag">Reported</span>
                    <span className="kchip">
                        <i />
                        Sent to moderators
                    </span>
                </div>
                <div className="kq-s s4" ref={stateRef(4)}>
                    <div className="kphoto">
                        <div className="ph" ref={photoRef} />
                        <dl>
                            <div>
                                <dt>location</dt>
                                <dd>
                                    <s>14.656° N, 121.066° E</s>
                                    <em>removed</em>
                                </dd>
                            </div>
                            <div>
                                <dt>place</dt>
                                <dd>Main Library, about 150 m</dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    );
}
