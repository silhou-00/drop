// The landing's common questions: five questions with their answers as plain text, each in a
// block that opens on tap and sits on its own paper card over the marble. The section fades in
// once as it enters the view; under reduced motion it simply shows.
import { useReveal } from "@/hooks/landing/use-reveal";

const QUESTIONS = [
    {
        q: "Do my friends need an account to send?",
        a: "No. They open your link, write, share their location, and drop it.",
    },
    {
        q: "When can people send me notes?",
        a: "Only while you have a statement up. Start one from My link and your link opens for two hours, or until you end it.",
    },
    {
        q: "Can I find out who sent a note?",
        a: "No. Nothing in Drop shows the sender, to you or to anyone else.",
    },
    {
        q: "How exact is the place?",
        a: "Rounded to about 150 m, and every note carries the sender's GPS location.",
    },
    {
        q: "What if a note is mean?",
        a: "Delete it, or end your statement to close your link. Drop has no block or report button, so read the Safety page for what you can do.",
    },
];

export function Questions() {
    const ref = useReveal<HTMLElement>();

    return (
        <section className="section questions" aria-labelledby="faq-title" ref={ref}>
            {/* heading */}
            <div className="sub-section">
                <div className="placement">
                    <div className="container">
                        <h2 id="faq-title" className="landing-heading landing-backed">
                            Questions
                        </h2>
                    </div>
                </div>
            </div>

            {/* questions and answers */}
            <div className="sub-section">
                <div className="placement faq">
                    {QUESTIONS.map((item) => (
                        <div className="container" key={item.q}>
                            <details className="faq-item">
                                <summary>{item.q}</summary>
                                <p>{item.a}</p>
                            </details>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
