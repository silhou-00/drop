// The landing's footer, on the calmed marble: the logo and a one-line summary with the page
// links and the fine print right under it, then five common questions as a message thread whose
// reply bubbles arrive as they scroll into view. Privacy, Terms and Safety open their own pages, and "Sign in"
// opens the sign-in page. Under reduced motion every reply is shown at once.
import { Link } from "@tanstack/react-router";

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
const LINKS = [
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
    { label: "Safety", to: "/safety" },
] as const;

export function SiteFooter() {
    return (
        <footer className="section footer">
            {/* summary, questions and links */}
            <div className="sub-section">
                {/* logo, summary, links and fine print */}
                <div className="placement foot-brand" data-calm="">
                    <div className="container">
                        <img className="logo foot-logo" src="/brand/logo.svg" alt="Drop" />
                    </div>
                    <div className="container">
                        <p className="legal foot-sum">
                            Anonymous notes from real places. Accessible by All. Places rounded to about 150 m.
                        </p>
                    </div>
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

                {/* questions as a thread */}
                <div className="placement thread" data-calm="">
                    <div className="container">
                        <h3>Questions</h3>
                    </div>
                    {QUESTIONS.map((item) => (
                        <div className="exchange" key={item.q}>
                            <div className="container bubble ask">
                                <p>{item.q}</p>
                            </div>
                            <div className="container bubble reply" data-fade="">
                                <p>{item.a}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </footer>
    );
}
