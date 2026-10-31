// The settings page. Appearance chooses light, dark or the device's setting, and the change
// grows out of the chosen option. Locations says how precisely a drop's place is kept. Sign
// out ends the session on the server and goes to sign-in; a failure shows as text. On phones
// the logo sits above the heading, since there is no rail to carry it.
import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Moon, SignOut } from "@phosphor-icons/react";
import { AppearanceControl } from "@/components/theme/appearance-control";
import { useSignOut } from "@/hooks/auth/use-sign-out";
import "@/styles/settings.css";

export const Route = createFileRoute("/_app/settings")({
    component: SettingsPage,
});

function SettingsPage() {
    const { signOut, pending, error } = useSignOut();

    return (
        <div className="app-sheet">
            {/* heading section */}
            <section className="section" aria-labelledby="settings-title">
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
                            <h1 id="settings-title" className="app-title">
                                Settings
                            </h1>
                        </div>
                    </div>
                </div>
            </section>

            {/* settings section */}
            <section className="section settings-section" aria-label="Your settings">
                {/* preferences */}
                <div className="sub-section settings-rows">
                    <div className="placement settings-row">
                        <div className="container settings-row-label">
                            <Moon className="settings-icon" weight="bold" aria-hidden="true" />
                            <span id="appearance-label">Appearance</span>
                        </div>
                        <div className="container">
                            <AppearanceControl />
                        </div>
                    </div>
                    <div className="placement settings-row">
                        <div className="container settings-row-label">
                            <MapPin className="settings-icon" weight="bold" aria-hidden="true" />
                            <span>Locations</span>
                        </div>
                        <div className="container">
                            <p className="settings-caption">Rounded to about 150 m</p>
                        </div>
                    </div>
                </div>

                {/* account */}
                <div className="sub-section settings-rows">
                    <div className="placement settings-row-full">
                        <div className="container">
                            <button
                                className="settings-row-btn"
                                type="button"
                                disabled={pending}
                                onClick={() => {
                                    void signOut();
                                }}
                            >
                                <SignOut className="settings-icon" weight="bold" aria-hidden="true" />
                                {pending ? "Signing out" : "Sign out"}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="sub-section">
                    <div className="placement">
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
