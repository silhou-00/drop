// The "add the Link sticker" guide, opened by Share on My link and on a drop's story panel. It
// covers the screen, above the app's nav, and walks five steps: copy the link, tap the sticker
// button, tap Link, paste the link, place it anywhere on the image. The first step
// shows the link with a Copy link button (it was already copied when the guide opened); the
// others show a screenshot of that step in the Instagram story editor, with a red ring over
// what to tap, and "Copy again". Back
// goes one step back. Every step but the last has Share now beside Next step, for owners who
// already know the way; Share copies the link again in the same tap and hands the image to the
// share sheet, or saves it where files cannot be shared and says what to do next. Focus moves
// to the heading on open and Tab stays inside the guide; Escape or the close button closes it,
// and the opener takes focus back. The link is shown as text only, never as an href.
import { ArrowLeft, Link, ShareFat, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { useLinkShare } from "@/hooks/profiles/use-link-share";
import type { useStoryCard } from "@/hooks/share/use-story-card";
import "@/styles/share.css";

type StickerGuideProps = {
    card: ReturnType<typeof useStoryCard>;
    copy: ReturnType<typeof useLinkShare>;
    link: string;
    onClose: () => void;
};

// a spot to tap, in percent of the screenshot so it scales with the image
type GuideSpot = { left: number; top: number; width: number; height: number; round?: boolean };

type GuideShot = { src: string; width: number; height: number; alt: string; spots: GuideSpot[] };

type GuideStep = { title: string; body: string; shot?: GuideShot };

const STEPS: GuideStep[] = [
    {
        title: "Copy your link",
        body: "Copy your link now. You will paste it into the Link sticker in a later step.",
    },
    {
        title: "Tap the sticker button",
        body: "With your image in a new story, tap the sticker button in the editor's toolbar.",
        shot: {
            src: "/guide/step-1-sticker-button.webp",
            width: 181,
            height: 605,
            alt: "The story editor toolbar, with the sticker button second from the top",
            spots: [{ left: 25, top: 23.5, width: 51, height: 15.5, round: true }],
        },
    },
    {
        title: "Tap Link",
        body: "Find the Link sticker in the tray and tap it.",
        shot: {
            src: "/guide/step-2-link-sticker.webp",
            width: 900,
            height: 621,
            alt: "The sticker tray, with the Link sticker in the bottom row",
            spots: [{ left: 54.5, top: 70, width: 17, height: 13.5 }],
        },
    },
    {
        title: "Paste your link",
        body: "Paste your link into the URL box, then tap the button in the top corner to finish.",
        shot: {
            src: "/guide/step-3-paste-link.webp",
            width: 900,
            height: 511,
            alt: "The Add link sheet, with an empty URL box",
            spots: [
                { left: 1.5, top: 38, width: 97, height: 18 },
                { left: 82.5, top: 22.5, width: 16, height: 13 },
            ],
        },
    },
    {
        title: "Place the sticker",
        body: "Drag the sticker to where you want it on your image.",
        shot: {
            src: "/guide/step-4-place-sticker.webp",
            width: 900,
            height: 415,
            alt: "A finished link sticker showing the Drop address",
            spots: [{ left: 15.5, top: 24, width: 68, height: 27 }],
        },
    },
];

// place a tap ring over its spot
function spotStyle(spot: GuideSpot): CSSProperties {
    return {
        left: `${spot.left}%`,
        top: `${spot.top}%`,
        width: `${spot.width}%`,
        height: `${spot.height}%`,
    };
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

// keeps Tab and Shift+Tab cycling through the guide's own controls
function trapTab(event: globalThis.KeyboardEvent, root: HTMLElement) {
    const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));

    if (items.length === 0) {
        return;
    }

    const first = items[0];
    const lastItem = items[items.length - 1];
    const active = document.activeElement;
    const outside = !root.contains(active);

    if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        lastItem.focus();
    } else if (!event.shiftKey && (active === lastItem || outside)) {
        event.preventDefault();
        first.focus();
    }
}

export function StickerGuide({ card, copy, link, onClose }: StickerGuideProps) {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const dialogRef = useRef<HTMLElement>(null);
    const [step, setStep] = useState(0);
    const last = step === STEPS.length - 1;
    const current = STEPS[step];

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    // Escape closes the guide; Tab wraps inside it so focus never reaches the page behind
    useEffect(() => {
        function handleKey(event: globalThis.KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();

                return;
            }

            if (event.key === "Tab" && dialogRef.current) {
                trapTab(event, dialogRef.current);
            }
        }

        document.addEventListener("keydown", handleKey);

        return () => {
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    // hand the image to the share sheet
    function handleShare() {
        void card.share();
    }

    return createPortal(
        <div className="auth-page app-page guide-layer">
            {/* guide */}
            <section
                ref={dialogRef}
                className="section guide"
                role="dialog"
                aria-modal="true"
                aria-labelledby="guide-title"
            >
                {/* close */}
                <div className="sub-section">
                    <div className="placement guide-top">
                        <div className="container">
                            <button className="share-close" type="button" aria-label="Close guide" onClick={onClose}>
                                <X weight="bold" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* title and step */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <h2 id="guide-title" className="guide-title" ref={headingRef} tabIndex={-1}>
                                How to add the link to your story
                            </h2>
                        </div>
                    </div>
                    <div className="placement auth-stack">
                        <div className="container">
                            <p className="guide-step-name">
                                <span className="guide-step-num">Step {step + 1}</span>
                                {current.title}
                            </p>
                        </div>
                        <div className="container">
                            <p className="auth-note">{current.body}</p>
                        </div>
                    </div>
                </div>

                {/* the link to copy, or the step's screenshot */}
                <div id="guide-panel" className="sub-section">
                    {current.shot ? (
                        <div className="placement guide-stage">
                            <div className="container guide-shot-frame">
                                <div key={current.shot.src} className="guide-shot-box">
                                    <img
                                        className="guide-shot"
                                        src={current.shot.src}
                                        width={current.shot.width}
                                        height={current.shot.height}
                                        alt={current.shot.alt}
                                        decoding="async"
                                    />
                                    {current.shot.spots.map((spot, index) => (
                                        <span
                                            key={index}
                                            className="guide-hot"
                                            data-round={spot.round ? "true" : undefined}
                                            style={spotStyle(spot)}
                                            aria-hidden="true"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="placement auth-stack guide-link-box">
                            <div className="container">
                                <p className="guide-link">{link.replace("/", "/\u200b")}</p>
                            </div>
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-paper"
                                    type="button"
                                    disabled={copy.busy}
                                    onClick={() => {
                                        void copy.copy();
                                    }}
                                >
                                    <Link weight="bold" aria-hidden="true" />
                                    Copy link
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* dots, copy, next, share and back */}
                <div className="sub-section">
                    <div className="placement guide-dots">
                        <div className="container">
                            <p className="inbox-sr">
                                Step {step + 1} of {STEPS.length}
                            </p>
                        </div>
                        {STEPS.map((item, index) => (
                            <div key={item.title} className="container">
                                <span
                                    className="guide-dot"
                                    data-current={index === step ? "true" : undefined}
                                    aria-hidden="true"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="placement guide-copy">
                        <div className="container">
                            <p className="auth-status" role="status">
                                {copy.message}
                            </p>
                        </div>
                        {current.shot ? (
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-text"
                                    type="button"
                                    disabled={copy.busy}
                                    onClick={() => {
                                        void copy.copy();
                                    }}
                                >
                                    Copy again
                                </button>
                            </div>
                        ) : null}
                    </div>
                    <div className="placement auth-stack">
                        {last ? null : (
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-ink"
                                    type="button"
                                    onClick={() => {
                                        setStep(step + 1);
                                    }}
                                >
                                    Next step
                                </button>
                            </div>
                        )}
                        <div className="container">
                            <button
                                className={last ? "auth-btn auth-btn-ink" : "auth-btn auth-btn-paper"}
                                type="button"
                                disabled={!card.ready || card.busy}
                                onClick={handleShare}
                            >
                                <ShareFat weight="bold" aria-hidden="true" />
                                {last ? "Share" : "Share now"}
                            </button>
                        </div>
                        {step > 0 ? (
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-text"
                                    type="button"
                                    onClick={() => {
                                        setStep(step - 1);
                                    }}
                                >
                                    <ArrowLeft weight="bold" aria-hidden="true" />
                                    Back
                                </button>
                            </div>
                        ) : null}
                        <div className="container">
                            <p className="auth-status" role="status">
                                {card.notice}
                            </p>
                        </div>
                        <div className="container">
                            <p className="auth-error" role="alert">
                                {card.error}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>,
        document.body,
    );
}
