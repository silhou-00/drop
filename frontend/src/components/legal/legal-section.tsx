// One titled part of a legal page. It renders a section with a heading row and a body row;
// the page passes the body's containers, one per paragraph or list, as children.
import type { ReactNode } from "react";

type LegalSectionProps = {
    id: string;
    title: string;
    children: ReactNode;
};

export function LegalSection({ id, title, children }: LegalSectionProps) {
    return (
        <section id={id} className="section legal-section" aria-labelledby={`${id}-title`}>
            {/* heading */}
            <div className="sub-section">
                <div className="placement">
                    <div className="container">
                        <h2 id={`${id}-title`} className="legal-h2">
                            {title}
                        </h2>
                    </div>
                </div>
            </div>

            {/* body */}
            <div className="sub-section">
                <div className="placement legal-text">{children}</div>
            </div>
        </section>
    );
}
