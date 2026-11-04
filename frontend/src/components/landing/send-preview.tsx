// Writing a note: a short heading and one line saying this is what a friend sees on your link,
// then one example card drawn like the real send page: the running statement on top, a note
// already written, the rounded place line and the Drop button. It is a picture only; nothing
// on it is a field or a button, so it cannot send anything. The card is thrown in as it enters
// the view; under reduced motion it simply shows.
import { Crosshair, PaperPlaneTilt } from "@phosphor-icons/react";
import { useReveal } from "@/hooks/landing/use-reveal";
import { DEFAULT_TEMPLATE_ID, STATEMENT_TEMPLATES } from "@/lib/statements/templates";

export const EXAMPLE_MESSAGE = "Saw you laughing at the night market. Best laugh on the whole street, honestly.";

const STATEMENT = STATEMENT_TEMPLATES.find((template) => template.id === DEFAULT_TEMPLATE_ID)?.text ?? "";

export function SendPreview() {
    const introRef = useReveal<HTMLDivElement>();
    const cardRef = useReveal<HTMLDivElement>();

    return (
        <section id="writing" className="section preview" aria-labelledby="writing-title">
            {/* heading and line */}
            <div className="sub-section" ref={introRef}>
                <div className="placement landing-intro">
                    <div className="container">
                        <h2 id="writing-title" className="landing-heading landing-backed">
                            Writing a note
                        </h2>
                    </div>
                    <div className="container">
                        <p className="landing-lead landing-backed">This is what a friend sees on your link.</p>
                    </div>
                </div>
            </div>

            {/* example send card */}
            <div className="sub-section" ref={cardRef} data-reveal="own">
                <div className="placement preview-place">
                    <div className="container preview-slot">
                        <article className="landing-card preview-card throw" aria-label="Example of the send page">
                            <span className="preview-tag">Example</span>
                            <p className="preview-statement">“{STATEMENT}”</p>
                            <p className="preview-label">Your message</p>
                            <p className="preview-field">{EXAMPLE_MESSAGE}</p>
                            <p className="preview-place-row">
                                <Crosshair className="preview-place-mark" weight="bold" aria-hidden="true" />
                                Your location is shared, rounded to about 150 m
                            </p>
                            <span className="preview-btn" aria-hidden="true">
                                <PaperPlaneTilt weight="bold" />
                                Drop
                            </span>
                        </article>
                    </div>
                </div>
            </div>
        </section>
    );
}
