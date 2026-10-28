// The beat pill at the bottom right on wide screens: "NN / 07", the beat's name and a thin bar
// for how far down the page the reader is. It is decoration for sighted readers, since every
// beat already carries its own number in the text, so screen readers skip it.
import { useRef } from "react";
import { beatAt } from "@/lib/landing/timeline";
import { useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

export function BeatProgress() {
    const numRef = useRef<HTMLElement>(null);
    const nameRef = useRef<HTMLSpanElement>(null);
    const barRef = useRef<HTMLElement>(null);
    const lastRef = useRef({ beat: -1, bar: "" });

    useTimelineFrame(({ L, S, changed }) => {
        const last = lastRef.current;

        if (!changed || !numRef.current || !nameRef.current || !barRef.current) {
            return;
        }

        const beat = beatAt(S.y, L);
        const bar = `scaleX(${S.prog.toFixed(4)})`;

        if (beat.index !== last.beat) {
            last.beat = beat.index;
            numRef.current.textContent = `0${beat.index + 1} / 07`;
            nameRef.current.textContent = beat.name;
        }

        if (bar !== last.bar) {
            last.bar = bar;
            barRef.current.style.transform = bar;
        }
    });

    return (
        <aside className="section meter-band" aria-hidden="true">
            {/* pill */}
            <div className="sub-section">
                {/* number, name and bar */}
                <div className="placement meter">
                    <div className="container">
                        <b ref={numRef}>01 / 07</b>
                    </div>
                    <div className="container">
                        <span className="m-name" ref={nameRef}>
                            Drop
                        </span>
                    </div>
                    <div className="container">
                        <span className="bar">
                            <i ref={barRef} />
                        </span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
