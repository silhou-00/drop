// Private by design: four short fact cards about what Drop keeps and shows, each true of the
// system as built: the sender is never shown, places are rounded, photos are cleaned of
// hidden data, and deleting an account takes the notes and photos with it. The heading fades
// in and the cards are thrown in one after another; under reduced motion they simply show.
import { Crosshair, EyeSlash, Image, Trash } from "@phosphor-icons/react";
import type { CSSProperties } from "react";
import { useReveal } from "@/hooks/landing/use-reveal";

const FACTS = [
    { icon: EyeSlash, title: "No sender, ever", body: "The sender is never shown, to you or to anyone." },
    { icon: Crosshair, title: "A rough place", body: "The place is rounded to about 150 m." },
    {
        icon: Image,
        title: "Clean photos",
        body: "Hidden data such as GPS is removed from photos before they are stored.",
    },
    {
        icon: Trash,
        title: "Yours to delete",
        body: "You can delete your account, and your notes and photos go with it.",
    },
];

export function PrivacyFacts() {
    const headingRef = useReveal<HTMLDivElement>();
    const cardsRef = useReveal<HTMLUListElement>();

    return (
        <section id="privacy" className="section facts" aria-labelledby="privacy-title">
            {/* heading */}
            <div className="sub-section" ref={headingRef}>
                <div className="placement">
                    <div className="container">
                        <h2 id="privacy-title" className="landing-heading landing-backed">
                            Private by design
                        </h2>
                    </div>
                </div>
            </div>

            {/* fact cards */}
            <ul className="sub-section fact-grid" ref={cardsRef} data-reveal="own">
                {FACTS.map((fact, index) => {
                    const Icon = fact.icon;

                    return (
                        <li className="placement step" key={fact.title} style={{ "--throw-i": index } as CSSProperties}>
                            <div className="container">
                                <article className="landing-card throw">
                                    <Icon className="fact-icon" weight="bold" aria-hidden="true" />
                                    <h3 className="card-title">{fact.title}</h3>
                                    <p className="card-body">{fact.body}</p>
                                </article>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
