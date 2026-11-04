// How it works, under the landing's first screen: three short cards for the three steps,
// claim a link, open it with a statement and share it to a story, then read the notes with
// their places. One column on phones, three from tablet up. The heading fades in as it enters
// the view and the cards are thrown onto the page one after another; under reduced motion
// both simply show.
import type { CSSProperties } from "react";
import { useReveal } from "@/hooks/landing/use-reveal";

const STEPS = [
    {
        num: "01",
        title: "Claim your link",
        body: "Pick a name and get your own link. It is free, for everyone.",
    },
    {
        num: "02",
        title: "Start a statement",
        body: "Pick a line on My link and share it. Your link opens for two hours. Put it in your story with a Link sticker.",
    },
    {
        num: "03",
        title: "Read the notes",
        body: "Notes land in your inbox, each with the place it was sent from, rounded to about 150 m.",
    },
];

export function HowItWorks() {
    const headingRef = useReveal<HTMLDivElement>();
    const cardsRef = useReveal<HTMLOListElement>();

    return (
        <section id="how-it-works" className="section how" aria-labelledby="how-title">
            {/* heading */}
            <div className="sub-section" ref={headingRef}>
                <div className="placement">
                    <div className="container">
                        <h2 id="how-title" className="landing-heading landing-backed">
                            How it works
                        </h2>
                    </div>
                </div>
            </div>

            {/* step cards */}
            <ol className="sub-section steps" ref={cardsRef} data-reveal="own">
                {STEPS.map((step, index) => (
                    <li className="placement step" key={step.num} style={{ "--throw-i": index } as CSSProperties}>
                        <div className="container">
                            <article className="landing-card throw">
                                <span className="card-num" aria-hidden="true">
                                    {step.num}
                                </span>
                                <h3 className="card-title">{step.title}</h3>
                                <p className="card-body">{step.body}</p>
                            </article>
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
}
