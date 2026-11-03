// Section 3, the statement: "Nothing shows who wrote it." The frame stays pinned while the
// letters resolve one by one out of a blur as the page scrolls, and resolve back on the way up.
// Screen readers get the whole sentence at once from the heading's label. Under reduced motion
// the sentence shows resolved.
import { useRef } from "react";
import { clamp } from "@/lib/landing/scenes";
import { useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

const TEXT = "Nothing shows who wrote it.";
const WORDS = TEXT.split(" ");
const LETTER_COUNT = TEXT.replace(/ /g, "").length;
const RESOLVE_END = 0.8;

export function StatementLine() {
    const { reduced } = useLanding();
    const headRef = useRef<HTMLHeadingElement>(null);
    const lastRef = useRef(-1);

    // letters up to the scroll point are resolved; only the ones that crossed change
    useTimelineFrame(({ S, changed }) => {
        const head = headRef.current;
        const n = reduced ? LETTER_COUNT : Math.round(clamp(S.p[4] / RESOLVE_END) * LETTER_COUNT);

        if (!head || !changed || n === lastRef.current) {
            return;
        }

        const letters = head.querySelectorAll(".lt");
        const from = Math.max(0, Math.min(n, lastRef.current));
        const to = Math.max(n, lastRef.current);

        for (let k = from; k < to && k < letters.length; k++) {
            letters[k].classList.toggle("on", k < n);
        }

        lastRef.current = n;
    });

    return (
        <section className="section pinned statement" id="statement" data-pin="" aria-labelledby="h2-st">
            {/* pinned frame */}
            <div className="sub-section frame">
                {/* the sentence */}
                <div className="placement st-line" data-calm="">
                    <div className="container">
                        <span className="num">Who sent it</span>
                    </div>
                    <div className="container">
                        <h2 id="h2-st" className="mega" aria-label={TEXT} ref={headRef}>
                            {WORDS.map((word, w) => (
                                <span className="word" aria-hidden="true" key={w}>
                                    {Array.from(word).map((letter, k) => (
                                        <span className="lt" key={k}>
                                            {letter}
                                        </span>
                                    ))}
                                </span>
                            ))}
                        </h2>
                    </div>
                    <div className="container">
                        <p className="lede" data-fade="">
                            No account, no name. Not to you, not to anyone.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
