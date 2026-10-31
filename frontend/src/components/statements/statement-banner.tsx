// The link status pill on the inbox, says whether the owner's link is taking drops. It sits
// in the title row beside the "N new" pill at every width, and the inbox melts the two into
// one shape through the shared goo filter. While a statement runs it shows a live dot and
// the time left, and the whole pill opens My link; once the link is closed it shows a muted
// dot, "Closed" and a Start link to My link. Nothing shows while the statement is loading or
// if that load failed. Text is shown as text.
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
            // running pill
            <div className="container statement-pill-box">
                <Link className="statement-pill" data-state="live" to="/my-link">
                    <span className="inbox-dot" aria-hidden="true" />
                    <span className="inbox-sr">Statement live, </span>
                    <span className="statement-pill-text">{timeLeftLabel(current.msLeft).replace(" left", "")}</span>
                    <span className="inbox-sr"> left. Open My link</span>
                </Link>
            </div>
        );
    }

    return (
        // closed pill
        <div className="container statement-pill-box">
            <p className="statement-pill" data-state="closed">
                <span className="statement-pill-dot" aria-hidden="true" />
                <span className="statement-pill-text">Closed</span>
                <span className="inbox-sr"> link</span>
                <Link className="statement-pill-link" to="/my-link">
                    Start<span className="inbox-sr"> a statement</span>
                </Link>
            </p>
        </div>
    );
}
