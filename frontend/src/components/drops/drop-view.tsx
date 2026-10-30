// One drop, read in full: on its own page on phones and tablets, and in the reading pane beside
// the list from laptops up. A bar on top holds the back button (phones and tablets), the day
// and time, and a read or unread toggle. Below: the message large, a badge for the place and
// one saying it came from GPS, the map of the rough area (loaded only here) and the photo
// behind a blur when there is one. At the foot: "Share to story" and a round Delete button;
// Delete swaps the row for an in-page confirm. Opening an unread drop marks it read once.
// After a delete the inbox opens with the filter kept and its heading takes focus. A
// malformed id or someone else's drop shows the same not-found view. Text only throughout.
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Crosshair, Envelope, EnvelopeOpen, InstagramLogo, MapPin, Trash } from "@phosphor-icons/react";
import { Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import { DeleteConfirm } from "@/components/drops/delete-confirm";
import { PhotoReveal } from "@/components/drops/photo-reveal";
import { useDeleteDrop } from "@/hooks/drops/use-delete-drop";
import { useDrop } from "@/hooks/drops/use-drop";
import { useMarkRead } from "@/hooks/drops/use-mark-read";
import { useOwnLink } from "@/hooks/profiles/use-own-link";
import { dayTime, fullTime } from "@/lib/drops/helper";

const DropMap = lazy(() => import("@/components/drops/drop-map").then((module) => ({ default: module.DropMap })));
const ShareSheet = lazy(() =>
    import("@/components/share/share-sheet").then((module) => ({ default: module.ShareSheet })),
);

type DropViewProps = { id: string; wide: boolean };

type FrameProps = {
    wide: boolean;
    title: string;
    shown?: boolean;
    time?: ReactNode;
    tool?: ReactNode;
    children: ReactNode;
};

// the section with its bar; the heading is h1 alone and h2 beside the list, and shown
// only for the not-found view
function DropFrame({ wide, title, shown = false, time, tool, children }: FrameProps) {
    const Heading = wide ? "h2" : "h1";

    return (
        <section className="section drop-view" aria-labelledby="drop-title">
            {/* bar */}
            <div className="sub-section drop-bar">
                <div className="placement drop-bar-row">
                    <div className="container drop-back">
                        <Link className="inbox-iconbtn" to="/inbox" search={(prev) => prev} aria-label="Back to inbox">
                            <ArrowLeft weight="bold" aria-hidden="true" />
                        </Link>
                    </div>
                    <div className="container drop-when">{time}</div>
                    <div className="container drop-tool">{tool}</div>
                </div>
                <div className="placement">
                    <div className="container">
                        <Heading id="drop-title" className={shown ? "drop-missing" : "inbox-sr"}>
                            {title}
                        </Heading>
                    </div>
                </div>
            </div>

            {children}
        </section>
    );
}

export function DropView({ id, wide }: DropViewProps) {
    const navigate = useNavigate();
    const drop = useDrop(id);
    const read = useMarkRead();
    const removal = useDeleteDrop();
    const own = useOwnLink();
    const markedRef = useRef("");
    const shareRef = useRef<HTMLButtonElement>(null);
    const [confirming, setConfirming] = useState(false);
    const [sharing, setSharing] = useState(false);
    const { state, update } = drop;
    const item = state.status === "ready" ? state.item : null;
    const opensUnread = item !== null && !item.is_read;
    const link = own.link;

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
        void read.mark(id, true, false).then((changed) => {
            if (changed) {
                update(changed);
            }
        });
    }, [opensUnread, id, read, update]);

    async function handleToggleRead() {
        if (!item) {
            return;
        }

        const changed = await read.mark(item.id, !item.is_read, item.is_read);

        if (changed) {
            update(changed);
        }
    }

    // closing the share panel puts focus back on its button
    function handleCloseShare() {
        setSharing(false);
        shareRef.current?.focus();
    }

    // back to the list with the filter kept, then focus its heading
    async function handleDelete() {
        if (!item) {
            return;
        }

        if (await removal.remove(item.id, !item.is_read)) {
            await navigate({ to: "/inbox", search: (prev) => prev, replace: true });
            requestAnimationFrame(() => {
                document.getElementById("inbox-title")?.focus();
            });
        }
    }

    if (state.status === "loading" || state.status === "signed-out") {
        return (
            <DropFrame wide={wide} title="Drop">
                {/* waiting */}
                <div className="sub-section drop-body">
                    <div className="placement">
                        <div className="container">
                            <p className="auth-status" role="status">
                                Loading
                            </p>
                        </div>
                    </div>
                </div>
            </DropFrame>
        );
    }

    if (state.status === "not-found" || state.status === "error" || !item) {
        const missing = state.status !== "error";

        return (
            <DropFrame wide={wide} title={missing ? "This drop is not here" : "Drop"} shown={missing}>
                {/* missing or failed */}
                <div className="sub-section drop-body">
                    <div className="placement auth-stack">
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
                </div>
            </DropFrame>
        );
    }

    const busy = read.pending || removal.pending;

    return (
        <DropFrame
            wide={wide}
            title="Anonymous drop"
            time={
                <time className="drop-time" dateTime={item.created_at} title={fullTime(item.created_at)}>
                    {dayTime(item.created_at)}
                </time>
            }
            tool={
                <button
                    className="inbox-iconbtn"
                    type="button"
                    disabled={busy}
                    aria-label={item.is_read ? "Mark unread" : "Mark read"}
                    onClick={() => {
                        void handleToggleRead();
                    }}
                >
                    {item.is_read ? (
                        <Envelope weight="bold" aria-hidden="true" />
                    ) : (
                        <EnvelopeOpen weight="bold" aria-hidden="true" />
                    )}
                </button>
            }
        >
            {/* message, place and media */}
            <div className="sub-section drop-body">
                {read.error ? (
                    // read errors
                    <div className="placement">
                        <div className="container">
                            <p className="auth-error" role="alert">
                                {read.error}
                            </p>
                        </div>
                    </div>
                ) : null}

                <div className="placement drop-message-row">
                    <div className="container drop-message-card">
                        <p className="drop-message">{item.message}</p>
                    </div>
                </div>

                <div className="placement drop-badges">
                    <div className="container">
                        <span className="inbox-badge">
                            <MapPin className="inbox-pin" weight="fill" aria-hidden="true" />
                            {item.location.name ?? "Place unknown"}
                        </span>
                    </div>
                    <div className="container">
                        <span className="inbox-badge">
                            <Crosshair weight="bold" aria-hidden="true" />
                            GPS
                        </span>
                    </div>
                </div>

                <div className="placement drop-media">
                    <div className="container drop-map">
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
                    {item.has_photo ? (
                        <div className="container drop-photo">
                            <PhotoReveal id={item.id} />
                        </div>
                    ) : null}
                </div>

                {sharing && link ? (
                    <Suspense
                        fallback={
                            // share loading
                            <div className="placement">
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
            </div>

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
                // share and delete
                <div className="sub-section drop-actions">
                    <div className="placement inbox-actions">
                        {link ? (
                            <div className="container inbox-grow">
                                <button
                                    className="auth-btn auth-btn-ink inbox-btn-large"
                                    type="button"
                                    ref={shareRef}
                                    aria-expanded={sharing}
                                    aria-controls={sharing ? "share-panel" : undefined}
                                    onClick={() => {
                                        setSharing((open) => !open);
                                    }}
                                >
                                    <InstagramLogo weight="bold" aria-hidden="true" />
                                    Share to story
                                </button>
                            </div>
                        ) : null}
                        <div className="container">
                            <button
                                className="inbox-iconbtn"
                                type="button"
                                disabled={busy}
                                aria-label="Delete"
                                onClick={() => {
                                    setSharing(false);
                                    setConfirming(true);
                                }}
                            >
                                <Trash weight="bold" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DropFrame>
    );
}
