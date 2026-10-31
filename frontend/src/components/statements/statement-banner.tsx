// The strip at the top of the inbox that says whether the owner's link is taking drops. While
// a statement runs it reads "Live:" with the statement and the time left; once the link is
// closed it says so and links to My link to start one. Nothing shows while the statement is
// loading or if that load failed, because the inbox works without it. Text is shown as text.
import { Link } from "@tanstack/react-router";
import { useCurrentStatement } from "@/hooks/statements/use-current-statement";
import { timeLeftLabel } from "@/lib/statements/helper";

export function StatementBanner() {
    const current = useCurrentStatement();

    if (current.status !== "ready") {
        return null;
    }

    if (current.statement) {
        return (
            // running banner
            <div className="placement statement-banner" data-state="live">
                <div className="container">
                    <span className="inbox-dot" aria-hidden="true" />
                </div>
                <div className="container statement-banner-text">
                    <p className="statement-banner-line">
                        <span className="statement-banner-label">Live:</span> “{current.statement.text}”
                    </p>
                </div>
                <div className="container">
                    <p className="statement-banner-left">{timeLeftLabel(current.msLeft)}</p>
                </div>
            </div>
        );
    }

    return (
        // closed banner
        <div className="placement statement-banner" data-state="closed">
            <div className="container statement-banner-text">
                <p className="statement-banner-line">Your link is closed</p>
            </div>
            <div className="container">
                <Link className="statement-banner-link" to="/my-link">
                    Start a statement
                </Link>
            </div>
        </div>
    );
}
