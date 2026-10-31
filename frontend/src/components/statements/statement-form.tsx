// The form that starts a statement on the My link page: one line of text with a live count,
// and a button that opens the owner's link for the fixed time. When a statement is already
// running, a note says the new one ends it. The text is checked with the shared rule before
// any request, and the hook's lock means a double click starts one statement. Errors, from the
// check or the server, show as text. The text box empties once the statement is running.
import { Megaphone } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useStartStatement } from "@/hooks/statements/use-start-statement";
import { durationLabel } from "@/lib/statements/helper";
import { STATEMENT_MAX, normalizeStatement } from "@/lib/statements/model";

type StatementFormProps = { replacing: boolean };

export function StatementForm({ replacing }: StatementFormProps) {
    const startStatement = useStartStatement();
    const [text, setText] = useState("");
    const count = Array.from(normalizeStatement(text)).length;
    const over = count > STATEMENT_MAX;

    // start once; the text clears when the statement is running
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (startStatement.pending) {
            return;
        }

        if (await startStatement.start(text)) {
            setText("");
        }
    }

    return (
        <form
            className="sub-section app-card mylink-statement-form"
            noValidate
            onSubmit={(event) => {
                void handleSubmit(event);
            }}
        >
            {/* text */}
            <div className="placement auth-stack">
                <div className="container">
                    <label className="auth-label" htmlFor="statement-text">
                        {replacing ? "Your new statement" : "Your statement"}
                    </label>
                </div>
                <div className="container">
                    <input
                        id="statement-text"
                        className="auth-input"
                        name="statement"
                        type="text"
                        autoComplete="off"
                        enterKeyHint="go"
                        placeholder="Ask your followers something"
                        value={text}
                        aria-invalid={over ? true : undefined}
                        aria-describedby="statement-count statement-error"
                        onChange={(event) => {
                            setText(event.target.value);
                        }}
                    />
                </div>
            </div>

            {/* count and note */}
            <div className="placement mylink-statement-meta">
                {replacing ? (
                    <div className="container">
                        <p className="auth-note">This ends your current statement.</p>
                    </div>
                ) : null}
                <div className="container mylink-count-wrap">
                    <p id="statement-count" className="mylink-count" data-over={over ? "true" : undefined}>
                        {count}/{STATEMENT_MAX}
                    </p>
                </div>
            </div>

            {/* start */}
            <div className="placement auth-stack">
                <div className="container">
                    <button className="auth-btn auth-btn-ink" type="submit" disabled={startStatement.pending}>
                        {startStatement.pending ? (
                            <span className="auth-spin" aria-hidden="true" />
                        ) : (
                            <Megaphone weight="bold" aria-hidden="true" />
                        )}
                        {startStatement.pending ? "Opening" : `Open my link for ${durationLabel()}`}
                    </button>
                </div>
                <div className="container">
                    <p id="statement-error" className="auth-error" role="alert">
                        {startStatement.error}
                    </p>
                </div>
            </div>
        </form>
    );
}
