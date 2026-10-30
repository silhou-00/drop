// Beat 02, "Leave it somewhere". The bath shrinks into a window (left on wide screens, top on
// phones) and combs into a street map. Pins pop onto real street corners of that map, the red
// one inside a dashed 150 m ring with its place label, while the copy card explains that
// every note is pinned to an area, never a spot. The pins, ring and label ride the bath's
// camera from the scene layer, so they are exported separately.
import { useRef, type CSSProperties } from "react";
import { ringRadius, toScreen } from "@/lib/landing/scenes";
import { useExitGroup, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

const PIN_SLOTS = [0, 1, 2, 3, 4, 5, 6];

// the beat copy
export function WindowBeat() {
    const sectionRef = useRef<HTMLElement>(null);

    useExitGroup(2, () => Array.from(sectionRef.current?.querySelectorAll<HTMLElement>("h2 .ln") ?? []));

    return (
        <section className="section beat" id="b2" aria-labelledby="h2-b2" ref={sectionRef}>
            {/* sticky frame */}
            <div className="sub-section frame">
                {/* copy card */}
                <div className="placement copy-r card-c">
                    <div className="container">
                        <span className="num">02 / 07</span>
                    </div>
                    <div className="container">
                        <h2 id="h2-b2" data-rise="">
                            <span className="ln">
                                <span className="li" style={{ "--n": 0 } as CSSProperties}>
                                    Leave it{" "}
                                </span>
                            </span>
                            <span className="ln i1">
                                <span className="li" style={{ "--n": 1 } as CSSProperties}>
                                    somewhere
                                </span>
                            </span>
                        </h2>
                    </div>
                    <div className="container">
                        <p className="copy" data-fade="">
                            Every note is pinned to a real place, rounded to about 150 m.
                            <span className="more">
                                {" "}
                                The library steps, Gate 2, the jeep line: it points to an area, never a spot.
                            </span>
                        </p>
                    </div>
                    <div className="container more">
                        <p className="small" data-fade="">
                            <i />
                            Every drop carries the sender's GPS location.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// pins on the combed streets, the 150 m ring and the place label, in the scene layer
export function WindowScene() {
    const pinsRef = useRef<HTMLDivElement>(null);
    const areaRef = useRef<HTMLDivElement>(null);
    const placeRef = useRef<HTMLDivElement>(null);
    const pinRefs = useRef<(HTMLSpanElement | null)[]>([]);

    useTimelineFrame(({ L, S, changed, relaid }) => {
        const layer = pinsRef.current;
        const area = areaRef.current;
        const place = placeRef.current;

        if (!layer || !area || !place || !changed) {
            return;
        }

        if (relaid) {
            pinRefs.current.forEach((pin, k) => {
                if (pin) {
                    pin.style.display = k < L.pins.length ? "" : "none";
                }
            });
        }

        const p = S.plate;
        const t2 = L.top[0];
        const pinsOn = S.y > t2 - 0.5 * L.H && S.dive < 0.35;
        const redOn = S.y > t2 - 0.5 * L.H && S.h3 < 0.3 && S.lens === 0;
        const ring = S.y > t2 - 0.3 * L.H && S.dive < 0.2;

        layer.classList.toggle("on", pinsOn);
        layer.classList.toggle("red-on", redOn);
        area.classList.toggle("on", ring);
        place.classList.toggle("on", ring);

        if (!pinsOn && !redOn) {
            return;
        }

        L.pins.forEach((pin, k) => {
            const el = pinRefs.current[k];

            if (!el || (k && !pinsOn)) {
                return;
            }

            const s = toScreen(pin.q, p, L.red.q, L.frame.cover);

            el.style.transform = `translate3d(${s[0].toFixed(1)}px,${s[1].toFixed(1)}px,0)`;
        });

        const r = ringRadius(L.frame, p);

        area.style.width = `${2 * r}px`;
        area.style.height = `${2 * r}px`;
        area.style.transform = `translate3d(${(p.sx - r).toFixed(1)}px,${(p.sy - r).toFixed(1)}px,0)`;
        place.style.transform = `translate3d(${p.sx.toFixed(1)}px,${(p.sy - r - 10).toFixed(1)}px,0)`;
    });

    return (
        <div className="placement">
            <div className="container obj area" ref={areaRef} />
            <div className="container pins" ref={pinsRef}>
                {PIN_SLOTS.map((k) => (
                    <span
                        key={k}
                        className={k === 0 ? "pin red" : "pin"}
                        style={{ "--i": k } as CSSProperties}
                        ref={(el) => {
                            pinRefs.current[k] = el;
                        }}
                    >
                        <i />
                    </span>
                ))}
            </div>
            <div className="container obj place" ref={placeRef}>
                <span>
                    <b>Main Library</b>, about 150 m
                </span>
            </div>
        </div>
    );
}
