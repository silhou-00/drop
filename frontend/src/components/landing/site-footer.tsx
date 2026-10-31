// The landing's footer on plain paper: the logo and a one-line summary, four common questions
// that open in place, the page links and the fine print. Privacy, Terms and Safety open their
// own pages, which start at the top, and "Sign in" opens the sign-in page. Drop has no block
// or report button, so the answer about mean notes points to deleting and the Safety page.
import { Link } from "@tanstack/react-router";

const QUESTIONS = [
    {
        q: "Do my friends need an account to send?",
        a: "No. They open your link, write, share their location, and drop it.",
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
        a: "Delete it. Drop has no block or report button yet, so read the Safety page for what you can do.",
    },
];
const LINKS = [
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
    { label: "Safety", to: "/safety" },
] as const;

export function SiteFooter() {
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
                                Anonymous notes from real places. Accessible by All. Places rounded to about 150 m.
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
                            <Link key={link.label} to={link.to}>
                                {link.label}
                            </Link>
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
