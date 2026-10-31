// The settings page. Appearance chooses light, dark or the device's setting, and the change
// grows out of the chosen option. Locations says how precisely a drop's place is kept. Sign
// out ends the session on the server and goes to sign-in; a failure shows as text. Delete
// account opens an in-page step that asks for the link name, read from the app layout's own
// profile, before the account and everything sent to it is deleted. About Drop links to the
// Terms, Privacy and Safety pages. On phones the logo sits above the heading, since there is
// no rail to carry it.
import { Link, createFileRoute } from "@tanstack/react-router";
import { CaretRight, LockKey, Lifebuoy, MapPin, Moon, Scroll, SignOut, Trash, type Icon } from "@phosphor-icons/react";
import { useContext, useState } from "react";
import { DeleteAccount } from "@/components/account/delete-account";
import { AppearanceControl } from "@/components/theme/appearance-control";
import { useDeleteAccount } from "@/hooks/account/use-delete-account";
import { useSignOut } from "@/hooks/auth/use-sign-out";
import { OwnLinkContext } from "@/hooks/profiles/use-own-link";
import "@/styles/settings.css";

type AboutLink = { label: string; to: "/terms" | "/privacy" | "/safety"; icon: Icon };

const ABOUT_LINKS: AboutLink[] = [
    { label: "Terms", to: "/terms", icon: Scroll },
    { label: "Privacy", to: "/privacy", icon: LockKey },
    { label: "Safety", to: "/safety", icon: Lifebuoy },
];

export const Route = createFileRoute("/_app/settings")({
    component: SettingsPage,
});

function SettingsPage() {
    const { signOut, pending, error } = useSignOut();
    const own = useContext(OwnLinkContext);
    const removal = useDeleteAccount();
    const [confirming, setConfirming] = useState(false);
    const username = own.status === "ready" ? own.profile.username : "";

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
                    <div className="placement settings-row-full">
                        <div className="container">
                            <button
                                className="settings-row-btn settings-row-danger"
                                type="button"
                                disabled={!username}
                                aria-expanded={confirming}
                                aria-controls="delete-account-panel"
                                onClick={() => {
                                    setConfirming((open) => !open);
                                }}
                            >
                                <Trash className="settings-icon" weight="bold" aria-hidden="true" />
                                Delete account
                            </button>
                        </div>
                    </div>
                </div>
                {confirming && username ? (
                    <DeleteAccount
                        username={username}
                        pending={removal.pending}
                        error={removal.error}
                        onConfirm={(typed) => {
                            void removal.remove(typed);
                        }}
                        onCancel={() => {
                            setConfirming(false);
                        }}
                    />
                ) : null}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <p className="auth-error" role="alert">
                                {error}
                            </p>
                        </div>
                    </div>
                </div>

                {/* about drop */}
                <nav className="sub-section settings-rows" aria-label="About Drop">
                    {ABOUT_LINKS.map((item) => (
                        <div key={item.to} className="placement settings-row-full">
                            <div className="container">
                                <Link className="settings-row-btn" to={item.to}>
                                    <item.icon className="settings-icon" weight="bold" aria-hidden="true" />
                                    {item.label}
                                    <CaretRight
                                        className="settings-icon settings-caret"
                                        weight="bold"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </div>
                        </div>
                    ))}
                </nav>
            </section>
        </div>
    );
}
