// The in-page panel that turns a drop into a story image. It shows a preview of the 9:16 card,
// switches for the photo (only when the drop has one that loaded) and the place (only when the
// drop has a place name), and Share and Save image buttons, both locked while one runs. Focus
// moves to the panel's heading when it opens; Escape or the close button closes it, and the
// page returns focus to its Share button. The card is drawn in the browser and never uploaded.
import { DownloadSimple, ShareFat, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useStoryCard } from "@/hooks/share/use-story-card";
import type { InboxItem } from "@/lib/drops/model";
import "@/styles/share.css";

const HINT = "In Instagram or TikTok, long-press the image to save it.";

type ShareSheetProps = {
    item: InboxItem;
    link: string;
    onClose: () => void;
};

export function ShareSheet({ item, link, onClose }: ShareSheetProps) {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const [includePhoto, setIncludePhoto] = useState(true);
    const [includePlace, setIncludePlace] = useState(true);

    const card = useStoryCard(
        {
            id: item.id,
            message: item.message,
            placeName: item.location.name,
            hasPhoto: item.has_photo,
            link,
        },
        { includePhoto, includePlace },
    );

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    // Escape closes the panel from anywhere on the page
    useEffect(() => {
        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKey);

        return () => {
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose]);

    const locked = !card.ready || card.busy;

    return (
        <div id="share-panel" className="share-panel" role="region" aria-labelledby="share-title">
            {/* heading and close */}
            <div className="placement share-head">
                <div className="container">
                    <h2 id="share-title" className="share-title" ref={headingRef} tabIndex={-1}>
                        Share to your story
                    </h2>
                </div>
                <div className="container">
                    <button className="share-close" type="button" aria-label="Close share panel" onClick={onClose}>
                        <X weight="bold" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {/* preview */}
            <div className="placement share-stage">
                <div className="container share-frame">
                    {card.previewUrl ? (
                        <img className="share-preview" src={card.previewUrl} alt="Preview of the story image" />
                    ) : (
                        <p className="share-wait auth-status" role="status">
                            Making the image
                        </p>
                    )}
                </div>
            </div>

            {card.photoAvailable || item.location.name ? (
                // options
                <div className="placement auth-stack">
                    {card.photoAvailable ? (
                        <div className="container">
                            <label className="share-switch">
                                <span>Include photo</span>
                                <input
                                    className="share-switch-input"
                                    type="checkbox"
                                    role="switch"
                                    checked={includePhoto}
                                    onChange={(event) => {
                                        setIncludePhoto(event.target.checked);
                                    }}
                                />
                            </label>
                        </div>
                    ) : null}
                    {item.location.name ? (
                        <div className="container">
                            <label className="share-switch">
                                <span>Include place</span>
                                <input
                                    className="share-switch-input"
                                    type="checkbox"
                                    role="switch"
                                    checked={includePlace}
                                    onChange={(event) => {
                                        setIncludePlace(event.target.checked);
                                    }}
                                />
                            </label>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {/* share and save */}
            <div className="placement inbox-actions">
                <div className="container">
                    <button
                        className="auth-btn auth-btn-ink"
                        type="button"
                        disabled={locked}
                        onClick={() => {
                            void card.share();
                        }}
                    >
                        <ShareFat weight="bold" aria-hidden="true" />
                        Share
                    </button>
                </div>
                <div className="container">
                    <button className="auth-btn auth-btn-paper" type="button" disabled={locked} onClick={card.save}>
                        <DownloadSimple weight="bold" aria-hidden="true" />
                        Save image
                    </button>
                </div>
            </div>

            {/* hint and errors */}
            <div className="placement auth-stack">
                <div className="container">
                    <p className="auth-note">{HINT}</p>
                </div>
                <div className="container">
                    <p className="auth-error" role="alert">
                        {card.error}
                    </p>
                </div>
            </div>
        </div>
    );
}
