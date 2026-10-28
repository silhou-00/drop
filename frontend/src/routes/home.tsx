// Home page, a placeholder until the inbox module replaces it. It shows the signed-in person's
// link, built as text from the username after it passes the username rule (never put into an
// href), a copy button with a fallback message, their display name, and sign out. A person
// without a profile is sent to claim one. The route guard only spares a trip; the server
// checks the session on every profile request.
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useOwnProfile } from "@/hooks/profiles/use-own-profile";
import { ApiError } from "@/lib/api";
import { getSession, signOut } from "@/lib/auth/client";
import { checkUsername } from "@/lib/profiles/model";

const COPIED_MESSAGE = "Link copied.";
const COPY_FAILED_MESSAGE = "Copy did not work. Select the link and copy it.";
const SIGN_OUT_FAILED_MESSAGE = "Could not sign out. Try again.";

export const Route = createFileRoute("/home")({
    beforeLoad: async () => {
        if (!(await getSession())) {
            throw redirect({ to: "/sign-in" });
        }
    },
    component: HomePage,
});

function HomePage() {
    const navigate = useNavigate();
    const own = useOwnProfile();
    const lockRef = useRef(false);
    const [copyMessage, setCopyMessage] = useState("");
    const [signOutError, setSignOutError] = useState("");
    const [signingOut, setSigningOut] = useState(false);

    // no profile yet goes to claim; an ended session goes to sign-in
    useEffect(() => {
        if (own.status === "missing") {
            void navigate({ to: "/claim", replace: true });
        } else if (own.status === "signed-out") {
            void navigate({ to: "/sign-in", replace: true });
        }
    }, [own.status, navigate]);

    const check = own.status === "ready" ? checkUsername(own.profile.username) : null;
    const link = check?.ok ? `drop.link/${check.value}` : "";

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(`https://${link}`);
            setCopyMessage(COPIED_MESSAGE);
        } catch {
            setCopyMessage(COPY_FAILED_MESSAGE);
        }
    }

    // sign out once, then back to sign-in
    async function handleSignOut() {
        if (lockRef.current) {
            return;
        }

        lockRef.current = true;
        setSigningOut(true);
        setSignOutError("");

        try {
            await signOut();
            await navigate({ to: "/sign-in", replace: true });
        } catch (caught) {
            lockRef.current = false;
            setSigningOut(false);
            setSignOutError(
                caught instanceof ApiError && caught.status === 429 ? caught.message : SIGN_OUT_FAILED_MESSAGE,
            );
        }
    }

    if (own.status !== "ready" || !link) {
        return (
            <AuthShell>
                {/* waiting section */}
                <section className="section" aria-labelledby="home-title">
                    {/* card */}
                    <div className="sub-section auth-card">
                        <div className="placement auth-stack">
                            <div className="container">
                                <h1 id="home-title" className="auth-title">
                                    Your link
                                </h1>
                            </div>
                            <div className="container">
                                {own.status === "error" ? (
                                    <p className="auth-error" role="alert">
                                        {own.message}
                                    </p>
                                ) : (
                                    <p className="auth-status" role="status">
                                        Loading
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            {/* link section */}
            <section className="section" aria-labelledby="home-title">
                {/* card */}
                <div className="sub-section auth-card">
                    {/* heading */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <p className="auth-note">Signed in as {own.profile.displayName}</p>
                        </div>
                        <div className="container">
                            <h1 id="home-title" className="auth-title">
                                Your link is ready
                            </h1>
                        </div>
                        <div className="container">
                            <p className="auth-lede">Share it anywhere. Your inbox opens on this page next.</p>
                        </div>
                    </div>

                    {/* link and copy */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <p className="auth-link">{link}</p>
                        </div>
                        <div className="container">
                            <button className="auth-btn auth-btn-ink" type="button" onClick={handleCopy}>
                                Copy link
                            </button>
                        </div>
                        <div className="container">
                            <p className="auth-status" role="status">
                                {copyMessage}
                            </p>
                        </div>
                    </div>

                    {/* sign out */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <button
                                className="auth-btn auth-btn-paper"
                                type="button"
                                disabled={signingOut}
                                onClick={handleSignOut}
                            >
                                {signingOut ? "Signing out" : "Sign out"}
                            </button>
                        </div>
                        <div className="container">
                            <p className="auth-error" role="alert">
                                {signOutError}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </AuthShell>
    );
}
