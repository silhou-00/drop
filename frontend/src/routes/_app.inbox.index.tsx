// The inbox with no drop open. From laptops up this fills the reading pane beside the list
// with a small marble patch and a hint; on phones and tablets the list stands alone and this
// pane is not shown.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/inbox/")({
    component: EmptyPane,
});

function EmptyPane() {
    return (
        <section className="section inbox-pick" aria-labelledby="inbox-pick-title">
            {/* hint */}
            <div className="sub-section">
                <div className="placement inbox-center">
                    <div className="container">
                        <div className="inbox-patch" aria-hidden="true" />
                    </div>
                </div>
                <div className="placement inbox-center">
                    <div className="container">
                        <h2 id="inbox-pick-title" className="inbox-group-title">
                            Pick a drop to read it
                        </h2>
                    </div>
                </div>
                <div className="placement inbox-center">
                    <div className="container">
                        <p className="auth-note">The newest are on top. Unread ones carry a red dot.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
