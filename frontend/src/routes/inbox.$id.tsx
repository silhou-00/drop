// One drop's page. It shows the message as text, the place name and how it was found, the time,
// a small map of the approximate area (loaded only here), and the photo behind a blur when there
// is one. Opening an unread drop marks it read once. The owner can mark it unread or read again,
// and delete it after an in-page confirm, which returns to the inbox. A malformed id shows the
// not-found view without a request, and so does someone else's drop, because the server answers
// both the same way. The route guard only spares a trip; the server checks every request.
// Share opens an in-page panel that makes a 9:16 story image; its code loads only when opened,
// and the link on it is built from the owner's username after it passes the username rule.
import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Envelope, EnvelopeOpen, MapPin, ShareFat, Trash } from "@phosphor-icons/react";
import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { DeleteConfirm } from "@/components/drops/delete-confirm";
import { PhotoReveal } from "@/components/drops/photo-reveal";
import { useDeleteDrop } from "@/hooks/drops/use-delete-drop";
import { useDrop } from "@/hooks/drops/use-drop";
import { useMarkRead } from "@/hooks/drops/use-mark-read";
import { useOwnProfile } from "@/hooks/profiles/use-own-profile";
import { getSession } from "@/lib/auth/client";
import { fullTime, relativeTime } from "@/lib/drops/helper";
import { checkUsername } from "@/lib/profiles/model";
import "@/styles/inbox.css";

const DropMap = lazy(() => import("@/components/drops/drop-map").then((module) => ({ default: module.DropMap })));
const ShareSheet = lazy(() =>
    import("@/components/share/share-sheet").then((module) => ({ default: module.ShareSheet })),
);

export const Route = createFileRoute("/inbox/$id")({
    beforeLoad: async () => {
        if (!(await getSession())) {
            throw redirect({ to: "/sign-in" });
        }
    },
    component: DropPage,
});

function DropCard({ children }: { children: ReactNode }) {
    return (
        // drop section
        <section className="section" aria-labelledby="drop-title">
            {/* card */}
            <div className="sub-section auth-card inbox-wide">
                {/* back link */}
                <div className="placement">
                    <div className="container">
                        <Link className="inbox-back" to="/inbox">
                            <ArrowLeft weight="bold" aria-hidden="true" />
                            Back to inbox
                        </Link>
                    </div>
                </div>

                {children}
            </div>
        </section>
    );
}

function DropPage() {
    const { id } = Route.useParams();
    const navigate = useNavigate();
    const drop = useDrop(id);
    const read = useMarkRead();
    const removal = useDeleteDrop();
    const own = useOwnProfile();
    const markedRef = useRef("");
    const shareRef = useRef<HTMLButtonElement>(null);
    const [confirming, setConfirming] = useState(false);
    const [sharing, setSharing] = useState(false);
    const { state, update } = drop;
    const item = state.status === "ready" ? state.item : null;
    const opensUnread = item !== null && !item.is_read;
    const check = own.status === "ready" ? checkUsername(own.profile.username) : null;
    const link = check?.ok ? `drop.link/${check.value}` : "";

    // an ended session goes back to sign-in
    useEffect(() => {
        if (state.status === "signed-out") {
            void navigate({ to: "/sign-in", replace: true });
        }
    }, [state.status, navigate]);

    // opening an unread drop marks it read, once per drop even when effects run twice
    useEffect(() => {
        if (!opensUnread || markedRef.current === id) {
            return;
        }

        markedRef.current = id;
        void read.mark(id, true).then((changed) => {
            if (changed) {
                update(changed);
            }
        });
    }, [opensUnread, id, read, update]);

    async function handleToggleRead() {
        if (!item) {
            return;
        }

        const changed = await read.mark(item.id, !item.is_read);

        if (changed) {
            update(changed);
        }
    }

    // closing the share panel puts focus back on its button
    function handleCloseShare() {
        setSharing(false);
        shareRef.current?.focus();
    }

    async function handleDelete() {
        if (await removal.remove(id)) {
            await navigate({ to: "/inbox", replace: true });
        }
    }

    if (state.status === "loading" || state.status === "signed-out") {
        return (
            <AuthShell>
                <DropCard>
                    {/* waiting */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <h1 id="drop-title" className="inbox-detail-title">
                                Drop
                            </h1>
                        </div>
                        <div className="container">
                            <p className="auth-status" role="status">
                                Loading
                            </p>
                        </div>
                    </div>
                </DropCard>
            </AuthShell>
        );
    }

    if (state.status === "not-found" || state.status === "error" || !item) {
        const missing = state.status !== "error";

        return (
            <AuthShell>
                <DropCard>
                    {/* missing or failed */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <h1 id="drop-title" className="auth-title">
                                {missing ? "This drop is not here" : "Drop"}
                            </h1>
                        </div>
                        <div className="container">
                            {state.status === "error" ? (
                                <p className="auth-error" role="alert">
                                    {state.message}
                                </p>
                            ) : (
                                <p className="auth-lede">It may have been deleted, or the link is wrong.</p>
                            )}
                        </div>
                        {missing ? null : (
                            <div className="container">
                                <button className="auth-btn auth-btn-paper" type="button" onClick={drop.retry}>
                                    Try again
                                </button>
                            </div>
                        )}
                    </div>
                </DropCard>
            </AuthShell>
        );
    }

    const busy = read.pending || removal.pending;

    return (
        <AuthShell>
            <DropCard>
                {/* message */}
                <div className="placement auth-stack">
                    <div className="container">
                        <h1 id="drop-title" className="inbox-detail-title">
                            Anonymous drop
                        </h1>
                    </div>
                    <div className="container">
                        <p className="inbox-message">{item.message}</p>
                    </div>
                </div>

                {/* place and time */}
                <div className="placement inbox-meta">
                    <div className="container">
                        <span className="inbox-meta-mark" aria-hidden="true">
                            <MapPin weight="fill" />
                        </span>
                    </div>
                    <div className="container inbox-grow">
                        <p className="inbox-place">{item.location.name ?? "Place unknown"}</p>
                        <p className="auth-note">From GPS, rounded to about 150 m</p>
                    </div>
                    <div className="container">
                        <time className="inbox-time" dateTime={item.created_at} title={fullTime(item.created_at)}>
                            {relativeTime(item.created_at)}
                        </time>
                    </div>
                </div>

                {/* map */}
                <div className="placement auth-stack">
                    <div className="container">
                        <Suspense
                            fallback={
                                <div className="inbox-map">
                                    <p className="inbox-map-wait auth-status" role="status">
                                        Loading map
                                    </p>
                                </div>
                            }
                        >
                            <DropMap latitude={item.location.lat} longitude={item.location.lng} />
                        </Suspense>
                    </div>
                </div>

                {item.has_photo ? (
                    // photo
                    <div className="placement auth-stack">
                        <div className="container">
                            <PhotoReveal id={item.id} />
                        </div>
                    </div>
                ) : null}

                {confirming ? (
                    <DeleteConfirm
                        pending={removal.pending}
                        error={removal.error}
                        onConfirm={() => {
                            void handleDelete();
                        }}
                        onCancel={() => {
                            setConfirming(false);
                        }}
                    />
                ) : (
                    <>
                        {link ? (
                            // share
                            <div className="placement auth-stack">
                                <div className="container">
                                    <button
                                        className="auth-btn auth-btn-ink"
                                        type="button"
                                        ref={shareRef}
                                        aria-expanded={sharing}
                                        aria-controls={sharing ? "share-panel" : undefined}
                                        onClick={() => {
                                            setSharing((open) => !open);
                                        }}
                                    >
                                        <ShareFat weight="bold" aria-hidden="true" />
                                        Share to story
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {sharing && link ? (
                            <Suspense
                                fallback={
                                    // share loading
                                    <div className="placement auth-stack">
                                        <div className="container">
                                            <p className="auth-status" role="status">
                                                Loading
                                            </p>
                                        </div>
                                    </div>
                                }
                            >
                                <ShareSheet item={item} link={link} onClose={handleCloseShare} />
                            </Suspense>
                        ) : null}

                        {/* actions */}
                        <div className="placement inbox-actions">
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-paper"
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                        void handleToggleRead();
                                    }}
                                >
                                    {item.is_read ? (
                                        <Envelope weight="bold" aria-hidden="true" />
                                    ) : (
                                        <EnvelopeOpen weight="bold" aria-hidden="true" />
                                    )}
                                    {item.is_read ? "Mark unread" : "Mark read"}
                                </button>
                            </div>
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-paper"
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                        setSharing(false);
                                        setConfirming(true);
                                    }}
                                >
                                    <Trash weight="bold" aria-hidden="true" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {read.error ? (
                    // read errors
                    <div className="placement auth-stack">
                        <div className="container">
                            <p className="auth-error" role="alert">
                                {read.error}
                            </p>
                        </div>
                    </div>
                ) : null}
            </DropCard>
        </AuthShell>
    );
}
