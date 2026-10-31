// Page frame for the legal pages: Terms, Privacy and Safety. It is kept light on purpose: no
// marble and no auth calls, so the pages load fast for anyone. A Back button goes to the page
// the person came from inside the app, or home when the page was opened directly. The logo
// links home, the page sits in main, and the footer's pill links mark the current page. Arriving from the landing's
// smooth scroller, it starts at the top, and it names the browser tab after the page. The
// colours follow the person's light or dark choice through the shared tokens.
import { ArrowLeft } from "@phosphor-icons/react";
import { Link, useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import "@/styles/legal.css";

type LegalShellProps = {
    title: string;
    children: ReactNode;
};

const FOOT_LINKS = [
    { label: "Terms", to: "/terms" },
    { label: "Privacy", to: "/privacy" },
    { label: "Safety", to: "/safety" },
    { label: "Home", to: "/" },
] as const;

export function LegalShell({ title, children }: LegalShellProps) {
    const router = useRouter();
    const navigate = useNavigate();
    const canGoBack = useCanGoBack();

    // start at the top and name the tab; the old name comes back on leave
    useEffect(() => {
        const previous = document.title;

        window.scrollTo(0, 0);
        document.title = `${title} | Drop`;

        return () => {
            document.title = previous;
        };
    }, [title]);

    // back inside the app, or home on a direct visit
    function handleBack() {
        if (canGoBack) {
            router.history.back();
        } else {
            void navigate({ to: "/" });
        }
    }

    return (
        <div className="legal-page">
            {/* top bar */}
            <header className="section legal-top">
                {/* back and logo row */}
                <div className="sub-section">
                    <div className="placement legal-top-row">
                        <div className="container">
                            <button className="legal-back" type="button" onClick={handleBack}>
                                <ArrowLeft weight="bold" aria-hidden="true" />
                                Back
                            </button>
                        </div>
                        <div className="container">
                            <Link className="legal-home" to="/" aria-label="Drop home">
                                <img className="legal-logo legal-logo-light" src="/brand/logo.svg" alt="" />
                                <img className="legal-logo legal-logo-dark" src="/brand/logo-dark.svg" alt="" />
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="legal-body">{children}</main>

            {/* footer */}
            <footer className="section legal-foot">
                {/* page links */}
                <div className="sub-section legal-foot-row">
                    <nav className="placement legal-foot-links" aria-label="Drop pages">
                        {FOOT_LINKS.map((link) => (
                            <div key={link.to} className="container">
                                <Link className="legal-foot-link" to={link.to} activeOptions={{ exact: true }}>
                                    {link.label}
                                </Link>
                            </div>
                        ))}
                    </nav>
                </div>
            </footer>
        </div>
    );
}
