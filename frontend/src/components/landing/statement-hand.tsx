// Pick a statement: the six statement cards from My link, taken from the same list so the
// lines never drift, thrown onto the page as a hand of cards. Phones and tablets get two columns;
// from laptops up the cards overlap in a fan, each turned a little around a pivot below the hand.
// One line under the hand says what a statement does. Under reduced motion the cards simply
// show, already fanned. On a pointer that can hover, a card lifts out of the hand and comes to
// the front. The cards are a picture of the choice, not buttons.
import type { CSSProperties } from "react";
import { useReveal } from "@/hooks/landing/use-reveal";
import { STATEMENT_TEMPLATES } from "@/lib/statements/templates";

const MIDDLE = (STATEMENT_TEMPLATES.length - 1) / 2;

export function StatementHand() {
    const headingRef = useReveal<HTMLDivElement>();
    const handRef = useReveal<HTMLDivElement>();
    const noteRef = useReveal<HTMLDivElement>();

    return (
        <section id="statements" className="section statements" aria-labelledby="statements-title">
            {/* heading */}
            <div className="sub-section" ref={headingRef}>
                <div className="placement">
                    <div className="container">
                        <h2 id="statements-title" className="landing-heading landing-backed">
                            Pick a statement
                        </h2>
                    </div>
                </div>
            </div>

            {/* the hand */}
            <div className="sub-section" ref={handRef} data-reveal="own">
                <ul className="placement hand">
                    {STATEMENT_TEMPLATES.map((template, index) => {
                        const slot = {
                            "--throw-i": index,
                            "--fan-i": index - MIDDLE,
                            "--tpl-accent": template.accent,
                        } as CSSProperties;

                        return (
                            <li className="container hand-slot" key={template.id} style={slot}>
                                <div className="hand-card throw">
                                    <span className="hand-mark" aria-hidden="true" />
                                    <span className="hand-text">{template.text}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* what a statement does */}
            <div className="sub-section" ref={noteRef}>
                <div className="placement">
                    <div className="container">
                        <p className="landing-lead landing-backed">A statement opens your link for two hours.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
