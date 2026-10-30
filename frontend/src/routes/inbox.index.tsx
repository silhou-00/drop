// Inbox page. The signed-in person's link sits on top, built as text from the username after it
// passes the username rule (never put into an href), with a copy button. Below it their drops,
// newest first, each a card that opens the drop; "Load more" fetches the next page while there is
// one. It has loading, empty (an invite to share the link), and error states with a retry, and
// sign out at the end. Signed out goes to sign-in and no profile yet goes to claim. The route
// guard only spares a trip; the server checks the session on every request.
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { InboxCard } from "@/components/drops/inbox-card";
import { useInbox } from "@/hooks/drops/use-inbox";
import { useOwnProfile } from "@/hooks/profiles/use-own-profile";
import { ApiError } from "@/lib/api";
import { getSession, signOut } from "@/lib/auth/client";
import { checkUsername } from "@/lib/profiles/model";
import "@/styles/inbox.css";

const COPIED_MESSAGE = "Link copied.";
const COPY_FAILED_MESSAGE = "Copy did not work. Select the link and copy it.";
const SIGN_OUT_FAILED_MESSAGE = "Could not sign out. Try again.";

export const Route = createFileRoute("/inbox/")({
    beforeLoad: async () => {
        if (!(await getSession())) {
            throw redirect({ to: "/sign-in" });
        }
    },
    component: InboxPage,
});

function InboxPage() {
    const navigate = useNavigate();
    const own = useOwnProfile();
    const inbox = useInbox();
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
                <section className="section" aria-labelledby="inbox-title">
                    {/* card */}
                    <div className="sub-section auth-card inbox-wide">
                        <div className="placement auth-stack">
                            <div className="container">
                                <h1 id="inbox-title" className="auth-title">
                                    Inbox
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
            <section className="section inbox-section" aria-labelledby="inbox-title">
                {/* link card */}
                <div className="sub-section auth-card inbox-wide">
                    {/* heading */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <p className="auth-note">Signed in as {own.profile.displayName}</p>
                        </div>
                        <div className="container">
                            <h1 id="inbox-title" className="auth-title">
                                Inbox
                            </h1>
                        </div>
                    </div>

                    {/* link and copy */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <p className="auth-label">Your link</p>
                        </div>
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
                </div>
            </section>

            {/* drops section */}
            <section className="section inbox-section" aria-labelledby="inbox-list-title">
                {/* list heading */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <h2 id="inbox-list-title" className="inbox-heading">
                                Drops
                            </h2>
                        </div>
                    </div>
                </div>

                {inbox.status === "error" && inbox.items.length === 0 ? (
                    // load failed
                    <div className="sub-section inbox-panel">
                        <div className="placement auth-stack">
                            <div className="container">
                                <p className="auth-error" role="alert">
                                    {inbox.error}
                                </p>
                            </div>
                            <div className="container">
                                <button className="auth-btn auth-btn-paper" type="button" onClick={inbox.retry}>
                                    Try again
                                </button>
                            </div>
                        </div>
                    </div>
                ) : inbox.status === "loading" && inbox.items.length === 0 ? (
                    // first load
                    <div className="sub-section inbox-panel">
                        <div className="placement auth-stack">
                            <div className="container">
                                <p className="auth-status" role="status">
                                    Loading your drops
                                </p>
                            </div>
                        </div>
                    </div>
                ) : inbox.items.length === 0 ? (
                    // empty inbox
                    <div className="sub-section inbox-panel">
                        <div className="placement auth-stack">
                            <div className="container">
                                <p className="inbox-empty-title">No drops yet</p>
                            </div>
                            <div className="container">
                                <p className="auth-lede">
                                    Share your link in your story. Every drop someone sends lands here.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // drop list
                    <ul className="sub-section inbox-list">
                        {inbox.items.map((item) => (
                            <li key={item.id} className="placement auth-stack">
                                <div className="container">
                                    <InboxCard item={item} />
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {inbox.items.length > 0 && (inbox.nextCursor || inbox.moreError || inbox.error) ? (
                    // more and late errors
                    <div className="sub-section">
                        <div className="placement auth-stack">
                            <div className="container">
                                <p className="auth-error" role="alert">
                                    {inbox.moreError || inbox.error}
                                </p>
                            </div>
                            {inbox.status === "error" ? (
                                <div className="container">
                                    <button className="auth-btn auth-btn-paper" type="button" onClick={inbox.retry}>
                                        Try again
                                    </button>
                                </div>
                            ) : null}
                            {inbox.nextCursor ? (
                                <div className="container">
                                    <button
                                        className="auth-btn auth-btn-paper"
                                        type="button"
                                        disabled={inbox.loadingMore}
                                        onClick={() => {
                                            void inbox.loadMore();
                                        }}
                                    >
                                        {inbox.loadingMore ? <span className="auth-spin" aria-hidden="true" /> : null}
                                        {inbox.loadingMore ? "Loading" : "Load more"}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </section>

            {/* account section */}
            <section className="section inbox-section" aria-label="Account">
                {/* sign out */}
                <div className="sub-section">
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
