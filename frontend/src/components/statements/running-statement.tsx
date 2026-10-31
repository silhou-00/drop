// The owner's running statement on the My link page: a Live mark with the time left counting
// down, the statement in large quoted type, and how many drops it has brought so far. "End now"
// closes the link early, after an in-place question that moves focus to Cancel so a stray Enter
// does not end it. The page owns the end, so its message outlives this card: the hook's lock
// means a double click sends one request, and a failure shows here as text. The statement
// text is shown as text only.
import { StopCircle } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useCurrentStatement } from "@/hooks/statements/use-current-statement";
import type { useEndStatement } from "@/hooks/statements/use-end-statement";
import { timeLeftLabel } from "@/lib/statements/helper";
import type { Statement } from "@/lib/statements/model";

type RunningStatementProps = { statement: Statement; ending: ReturnType<typeof useEndStatement> };

// the question before the link closes early, in place of the End now row
function EndConfirm({
    pending,
    onConfirm,
    onCancel,
}: {
    pending: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        cancelRef.current?.focus();
    }, []);

    return (
        <>
            {/* question */}
            <div className="placement auth-stack">
                <div className="container">
                    <p id="statement-end-title" className="inbox-confirm-title">
                        End this statement? Your link stops taking drops now.
                    </p>
                </div>
            </div>

            {/* answers */}
            <div className="placement inbox-actions" role="group" aria-labelledby="statement-end-title">
                <div className="container inbox-grow">
                    <button className="auth-btn inbox-btn-danger" type="button" disabled={pending} onClick={onConfirm}>
                        {pending ? <span className="auth-spin" aria-hidden="true" /> : null}
                        {pending ? "Ending" : "End now"}
                    </button>
                </div>
                <div className="container inbox-grow">
                    <button
                        className="auth-btn auth-btn-paper"
                        type="button"
                        disabled={pending}
                        ref={cancelRef}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </>
    );
}

export function RunningStatement({ statement, ending }: RunningStatementProps) {
    const current = useCurrentStatement();
    const [confirming, setConfirming] = useState(false);
    const drops = statement.drop_count === 1 ? "1 drop so far" : `${statement.drop_count} drops so far`;

    async function handleEnd() {
        if (await ending.end(statement.id)) {
            setConfirming(false);
        }
    }

    return (
        // running statement card
        <div className="sub-section app-card mylink-running">
            {/* live mark and time left */}
            <div className="placement mylink-running-top">
                <div className="container">
                    <p className="mylink-live">
                        <span className="inbox-dot" aria-hidden="true" />
                        Live
                    </p>
                </div>
                <div className="container">
                    <p className="mylink-left" role="timer" aria-live="off">
                        {timeLeftLabel(current.msLeft)}
                    </p>
                </div>
            </div>

            {/* statement */}
            <div className="placement auth-stack">
                <div className="container">
                    <p className="mylink-statement-text">“{statement.text}”</p>
                </div>
                <div className="container">
                    <p className="auth-note">{drops}</p>
                </div>
            </div>

            {/* end */}
            {confirming ? (
                <EndConfirm
                    pending={ending.pending}
                    onConfirm={() => {
                        void handleEnd();
                    }}
                    onCancel={() => {
                        setConfirming(false);
                    }}
                />
            ) : (
                <div className="placement auth-stack">
                    <div className="container">
                        <button
                            className="auth-btn auth-btn-paper"
                            type="button"
                            onClick={() => {
                                setConfirming(true);
                            }}
                        >
                            <StopCircle weight="bold" aria-hidden="true" />
                            End now
                        </button>
                    </div>
                </div>
            )}

            {/* failure */}
            <div className="placement auth-stack">
                <div className="container">
                    <p className="auth-error" role="alert">
                        {ending.error}
                    </p>
                </div>
            </div>
        </div>
    );
}
