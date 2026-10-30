// Public send page at drop.link/<name>. Anyone can write the owner an anonymous drop here,
// with its GPS place. A name with capitals is sent on to its lowercase form. The page
// shows loading, a friendly not-found (also for invalid or reserved names), a load error, a
// paused link (no form), the form, and the sent confirmation. Static pages such as /sign-in
// and /claim rank above this route. The server checks every rule again on send.
import { Link, createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { DropForm } from "@/components/drops/drop-form";
import { SentCard } from "@/components/drops/sent-card";
import { useSendDrop } from "@/hooks/drops/use-send-drop";
import { usePublicProfile } from "@/hooks/profiles/use-public-profile";
import { LINK_PAUSED_MESSAGE } from "@/lib/drops/model";
import type { PublicProfile } from "@/lib/profiles/model";
import "@/styles/send.css";

export const Route = createFileRoute("/$username")({
    beforeLoad: ({ params }) => {
        const lower = params.username.toLowerCase();

        if (params.username !== lower) {
            throw redirect({ to: "/$username", params: { username: lower }, replace: true });
        }
    },
    component: SendPage,
});

// an avatar address is shown only when it is https or a same-origin path
function safeAvatarUrl(value: string | null) {
    if (!value) {
        return null;
    }

    try {
        const url = new URL(value, window.location.origin);
        const samePath = value.startsWith("/") && !value.startsWith("//") && url.origin === window.location.origin;

        return url.protocol === "https:" || samePath ? url.href : null;
    } catch {
        return null;
    }
}

function SendCard({ children }: { children: ReactNode }) {
    return (
        // send section
        <section className="section" aria-labelledby="send-title">
            {/* card */}
            <div className="sub-section auth-card send-card">{children}</div>
        </section>
    );
}

function ProfileHeading({ profile }: { profile: PublicProfile }) {
    const avatar = safeAvatarUrl(profile.avatarUrl);
    const initial = Array.from(profile.displayName.trim())[0]?.toUpperCase() ?? "";

    return (
        <>
            {/* who */}
            <div className="placement send-who">
                <div className="container">
                    {avatar ? (
                        <img className="send-avatar" src={avatar} alt="" />
                    ) : (
                        <span className="send-avatar" aria-hidden="true">
                            {initial}
                        </span>
                    )}
                </div>
                <div className="container">
                    <p className="send-handle">drop.link/{profile.username}</p>
                </div>
            </div>

            {/* title */}
            <div className="placement auth-stack">
                <div className="container">
                    <h1 id="send-title" className="auth-title">
                        Send {profile.displayName} an anonymous drop
                    </h1>
                </div>
            </div>
        </>
    );
}

function SendPage() {
    const { username } = Route.useParams();
    const page = usePublicProfile(username);
    const drop = useSendDrop(username);
    const displayName = page.profile?.displayName ?? "";

    // page title follows the owner's display name
    useEffect(() => {
        if (!displayName) {
            return;
        }

        const previous = document.title;

        document.title = `Send ${displayName} an anonymous drop`;

        return () => {
            document.title = previous;
        };
    }, [displayName]);

    if (page.status === "loading") {
        return (
            <AuthShell>
                <SendCard>
                    {/* waiting */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <h1 id="send-title" className="auth-title">
                                Send an anonymous drop
                            </h1>
                        </div>
                        <div className="container">
                            <p className="auth-status" role="status">
                                Loading
                            </p>
                        </div>
                    </div>
                </SendCard>
            </AuthShell>
        );
    }

    if (page.status === "not-found" || page.status === "error" || !page.profile) {
        const missing = page.status !== "error";

        return (
            <AuthShell>
                <SendCard>
                    {/* missing or failed */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <h1 id="send-title" className="auth-title">
                                {missing ? "This link leads nowhere" : "Send an anonymous drop"}
                            </h1>
                        </div>
                        <div className="container">
                            {missing ? (
                                <p className="auth-lede">There is no drop.link with that name. Check the spelling.</p>
                            ) : (
                                <p className="auth-error" role="alert">
                                    {page.error}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* home link */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <Link className="auth-btn auth-btn-ink" to="/">
                                Go to Drop
                            </Link>
                        </div>
                    </div>
                </SendCard>
            </AuthShell>
        );
    }

    if (drop.status === "sent") {
        return (
            <AuthShell>
                <SentCard displayName={displayName} onSendAnother={drop.reset} />
            </AuthShell>
        );
    }

    const paused = !page.profile.acceptingDrops || drop.paused;

    return (
        <AuthShell>
            <SendCard>
                <ProfileHeading profile={page.profile} />

                {paused ? (
                    // paused link: no form
                    <div className="placement auth-stack">
                        <div className="container">
                            <p className="auth-lede" role="status">
                                {LINK_PAUSED_MESSAGE}
                            </p>
                        </div>
                        <div className="container">
                            <Link className="auth-btn auth-btn-paper" to="/">
                                Go to Drop
                            </Link>
                        </div>
                    </div>
                ) : (
                    <DropForm
                        displayName={displayName}
                        sending={drop.status === "sending"}
                        error={drop.status === "error" ? drop.error : null}
                        onSend={(draft) => {
                            void drop.send(draft);
                        }}
                    />
                )}
            </SendCard>
        </AuthShell>
    );
}
