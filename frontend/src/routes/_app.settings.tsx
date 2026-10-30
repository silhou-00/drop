// The settings page. For now it holds sign out, which ends the session on the server and goes
// to sign-in; a failure shows as text.
import { createFileRoute } from "@tanstack/react-router";
import { useSignOut } from "@/hooks/auth/use-sign-out";

export const Route = createFileRoute("/_app/settings")({
    component: SettingsPage,
});

function SettingsPage() {
    const { signOut, pending, error } = useSignOut();

    return (
        <div className="app-sheet">
            {/* settings section */}
            <section className="section" aria-labelledby="settings-title">
                {/* heading */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <h1 id="settings-title" className="app-title">
                                Settings
                            </h1>
                        </div>
                    </div>
                </div>

                {/* account */}
                <div className="sub-section app-card">
                    <div className="placement auth-stack">
                        <div className="container">
                            <button
                                className="auth-btn auth-btn-paper"
                                type="button"
                                disabled={pending}
                                onClick={() => {
                                    void signOut();
                                }}
                            >
                                {pending ? "Signing out" : "Sign out"}
                            </button>
                        </div>
                        <div className="container">
                            <p className="auth-error" role="alert">
                                {error}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
