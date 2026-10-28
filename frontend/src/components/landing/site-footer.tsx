// The landing's footer on plain paper: the logo and a one-line summary, four common questions
// that open in place, the page links and the fine print. Links scroll through the landing's
// smooth scroller. The legal pages do not exist yet, so those links lead back to the top.
// "Sign in" opens the sign-in page.
import type { MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useLanding } from "@/hooks/landing/use-scroll-timeline";

const QUESTIONS = [
    {
        q: "Do my friends need an account to send?",
        a: "No. They open your link, write, pick a place, and drop it.",
    },
    {
        q: "Can I find out who sent a note?",
        a: "No. Nothing in Drop shows the sender, to you or to anyone else.",
    },
    {
        q: "How exact is the place?",
        a: "Rounded to about 150 m, and each note says whether it came from GPS or was picked by hand.",
    },
    {
        q: "What if a note is mean?",
        a: "Block it and it is deleted, silently. Report it and a moderator looks at it.",
    },
];
const LINKS = [
    { label: "Privacy", href: "#top" },
    { label: "Terms", href: "#top" },
    { label: "Safety", href: "#top" },
];

export function SiteFooter() {
    const { scrollToTarget } = useLanding();

    function handleAnchor(event: MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        scrollToTarget(event.currentTarget.hash);
    }

    return (
        <footer className="section footer">
            {/* questions and links */}
            <div className="sub-section">
                {/* summary and questions */}
                <div className="placement foot-grid">
                    <div className="foot-brand">
                        <div className="container">
                            <img className="logo foot-logo" src="/brand/logo.svg" alt="Drop" />
                        </div>
                        <div className="container">
                            <p className="legal foot-sum">
                                Anonymous notes from real places. For people 18 and over. Places rounded to about 150 m.
                            </p>
                        </div>
                    </div>
                    <div className="container faq">
                        <h3>Questions</h3>
                        {QUESTIONS.map((item) => (
                            <details key={item.q}>
                                <summary>{item.q}</summary>
                                <p>{item.a}</p>
                            </details>
                        ))}
                    </div>
                </div>

                {/* links and fine print */}
                <div className="placement">
                    <div className="container links">
                        {LINKS.map((link) => (
                            <a key={link.label} href={link.href} onClick={handleAnchor}>
                                {link.label}
                            </a>
                        ))}
                        <Link to="/sign-in">Sign in</Link>
                    </div>
                    <div className="container">
                        <p className="legal">Sample notes and coordinates are examples.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
