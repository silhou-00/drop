// The heading over one inbox section. A statement section shows the statement in quotes, cut
// to two lines, with when it started, how many drops it brought in all, and a Live mark while
// it runs. The section for drops from before statements reads "Earlier" with its own count.
// Outside a scoped view, "View all" puts the section in the address so the list shows just
// its drops. Statement text is shown as text only.
import { useNavigate } from "@tanstack/react-router";
import { CaretRight } from "@phosphor-icons/react";
import { dayTime } from "@/lib/drops/helper";
import type { Statement } from "@/lib/statements/model";

type StatementHeaderProps = { statement: Statement | null; earlierCount: number; scoped: boolean };

function dropsLabel(count: number) {
    return count === 1 ? "1 drop" : `${count} drops`;
}

export function StatementHeader({ statement, earlierCount, scoped }: StatementHeaderProps) {
    const navigate = useNavigate();

    // only this section's drops, in the address
    function handleScope() {
        void navigate({
            to: ".",
            search: (prev) => ({ ...prev, statement: statement ? statement.id : "earlier" }),
        });
    }

    return (
        <>
            {/* title */}
            <div className="placement statement-head">
                <div className="container statement-head-text">
                    <h2 className="statement-head-title" data-earlier={statement ? undefined : "true"}>
                        {statement ? `“${statement.text}”` : "Earlier"}
                    </h2>
                </div>
                {statement?.running ? (
                    <div className="container">
                        <p className="statement-live">
                            <span className="inbox-dot" aria-hidden="true" />
                            Live
                        </p>
                    </div>
                ) : null}
            </div>

            {/* meta and scope */}
            <div className="placement statement-head-meta">
                <div className="container">
                    <p className="statement-head-when">
                        {statement ? dayTime(statement.started_at) : "From before statements"}
                    </p>
                </div>
                <div className="container">
                    <p className="statement-head-count">
                        {dropsLabel(statement ? statement.drop_count : earlierCount)}
                    </p>
                </div>
                {scoped ? null : (
                    <div className="container statement-head-scope">
                        <button
                            className="statement-scope-btn"
                            type="button"
                            aria-label={statement ? "View all drops for this statement" : "View all earlier drops"}
                            onClick={handleScope}
                        >
                            View all
                            <CaretRight className="statement-scope-icon" weight="bold" aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
