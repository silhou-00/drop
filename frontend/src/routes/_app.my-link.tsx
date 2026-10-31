// The My link page. First the statement: the line that opens the owner's link for a fixed
// time. While one runs it shows with its time left, its drop count and "End now", and "New
// statement" opens the form to replace it; with none running the form shows on its own. Then
// the owner's public link with Copy, and while a statement runs, Share and a preview of the
// story image made from it, so the link can go into a story or a bio from anywhere in the app.
// The page owns ending a statement, so the server's message stays on screen after the running
// card closes. On phones the logo sits above the heading, since there is no rail to carry it.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LinkCard } from "@/components/profiles/link-card";
import { RunningStatement } from "@/components/statements/running-statement";
import { StatementForm } from "@/components/statements/statement-form";
import { useCurrentStatement } from "@/hooks/statements/use-current-statement";
import { useEndStatement } from "@/hooks/statements/use-end-statement";
import "@/styles/my-link.css";

export const Route = createFileRoute("/_app/my-link")({
    component: MyLinkPage,
});

// the statement card, the form, or the load state
function StatementSection() {
    const current = useCurrentStatement();
    const ending = useEndStatement();
    const [replacingFor, setReplacingFor] = useState<string | null>(null);

    if (current.status === "error") {
        return (
            // load failed
            <div className="sub-section app-card">
                <div className="placement auth-stack">
                    <div className="container">
                        <p className="auth-error" role="alert">
                            {current.error}
                        </p>
                    </div>
                    <div className="container">
                        <button className="auth-btn auth-btn-paper" type="button" onClick={current.retry}>
                            Try again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (current.status !== "ready") {
        return (
            // waiting
            <div className="sub-section app-card">
                <div className="placement">
                    <div className="container">
                        <p className="auth-status" role="status">
                            Loading
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!current.statement) {
        return (
            <>
                <StatementForm replacing={false} />
                {ending.error ? (
                    // why the last statement closed
                    <div className="sub-section">
                        <div className="placement">
                            <div className="container">
                                <p className="auth-status" role="status">
                                    {ending.error}
                                </p>
                            </div>
                        </div>
                    </div>
                ) : null}
            </>
        );
    }

    const statement = current.statement;
    const replacing = replacingFor === statement.id;

    return (
        <>
            <RunningStatement statement={statement} ending={ending} />

            {/* new statement toggle */}
            <div className="sub-section">
                <div className="placement">
                    <div className="container">
                        <button
                            className="auth-btn auth-btn-paper"
                            type="button"
                            aria-expanded={replacing}
                            aria-controls="statement-text"
                            onClick={() => {
                                setReplacingFor(replacing ? null : statement.id);
                            }}
                        >
                            {replacing ? "Keep this statement" : "New statement"}
                        </button>
                    </div>
                </div>
            </div>
            {replacing ? <StatementForm replacing /> : null}
        </>
    );
}

function MyLinkPage() {
    return (
        <div className="app-sheet">
            {/* heading section */}
            <section className="section" aria-labelledby="my-link-title">
                {/* logo and heading */}
                <div className="sub-section">
                    <div className="placement app-mobile-logo">
                        <div className="container">
                            <img className="app-logo app-logo-light" src="/brand/logo.svg" alt="Drop" />
                            <img className="app-logo app-logo-dark" src="/brand/logo-dark.svg" alt="Drop" />
                        </div>
                    </div>
                    <div className="placement">
                        <div className="container">
                            <h1 id="my-link-title" className="app-title">
                                My link
                            </h1>
                        </div>
                    </div>
                </div>
            </section>

            {/* statement section */}
            <section className="section mylink-section" aria-label="Your statement">
                <StatementSection />
            </section>

            {/* link section */}
            <section className="section mylink-section" aria-label="Your link">
                <LinkCard />
            </section>
        </div>
    );
}
