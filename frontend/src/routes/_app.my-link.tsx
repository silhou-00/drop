// The My link page. First the running statement, when there is one, with its time left, its
// drop count and "End now". Then the statement cards to swipe through: a first card to write
// your own, then ready-made lines. Then the two steps: copy the link, and Share, which starts the
// chosen statement when it is not the one running and opens the guide for adding the link to
// a story. A running statement that matches a card starts with that card chosen. The page owns
// ending a statement, so the server's message stays on screen after the running card closes.
// On wide screens the steps take the left column and the cards stay in view on the right.
// On phones the logo sits above the heading, since there is no rail to carry it.
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LinkCard } from "@/components/profiles/link-card";
import { RunningStatement } from "@/components/statements/running-statement";
import { TemplateCarousel } from "@/components/statements/template-carousel";
import { useCurrentStatement } from "@/hooks/statements/use-current-statement";
import { useEndStatement } from "@/hooks/statements/use-end-statement";
import { CUSTOM_TEMPLATE_ID, DEFAULT_TEMPLATE_ID, STATEMENT_TEMPLATES, templateFor } from "@/lib/statements/templates";
import "@/styles/my-link.css";

export const Route = createFileRoute("/_app/my-link")({
    component: MyLinkPage,
});

// the running statement, the load state, or why the last one closed; nothing otherwise
function StatementSection() {
    const current = useCurrentStatement();
    const ending = useEndStatement();

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

    if (current.statement) {
        return <RunningStatement statement={current.statement} ending={ending} />;
    }

    if (!ending.error) {
        return null;
    }

    return (
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
    );
}

function MyLinkPage() {
    const current = useCurrentStatement();
    const [chosen, setChosen] = useState<string | null>(null);
    const [customText, setCustomText] = useState("");
    const runningTemplate = current.statement ? templateFor(current.statement.text) : undefined;
    const selectedId = chosen ?? runningTemplate?.id ?? DEFAULT_TEMPLATE_ID;
    const selected = STATEMENT_TEMPLATES.find((template) => template.id === selectedId);
    const selectedText = selectedId === CUSTOM_TEMPLATE_ID ? customText : (selected?.text ?? "");

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

            {/* statement, cards and steps; the steps move to a right-hand column from laptop width */}
            <div className="mylink-columns">
                {/* statement section */}
                <section className="section mylink-section" aria-label="Your statement">
                    <StatementSection />
                </section>

                {/* cards section */}
                <section className="section mylink-section mylink-cards-col" aria-label="Statement cards">
                    <TemplateCarousel
                        selectedId={selectedId}
                        customText={customText}
                        onSelect={setChosen}
                        onCustomText={setCustomText}
                    />
                </section>

                {/* link section */}
                <section className="section mylink-section mylink-steps-col" aria-label="Your link">
                    <LinkCard text={selectedText} />
                </section>
            </div>
        </div>
    );
}
