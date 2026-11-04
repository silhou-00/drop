// The in-page panel that turns a drop into a story image. It shows a preview of the 9:16 card,
// switches for the photo (only when the drop has one that loaded) and the place (only when the
// drop has a place name), and Share and Save image buttons, both locked while one runs. Share
// copies the owner's link in the same tap and opens the sticker guide, which ends in sharing
// the image. Focus moves to the panel's heading when it opens; Escape or the close button
// closes it (or only the guide while that is open), and the page returns focus to its Share
// button. The card is drawn in the browser and never uploaded.
import { DownloadSimple, ShareFat, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { StickerGuide } from "@/components/share/sticker-guide";
import { useLinkShare } from "@/hooks/profiles/use-link-share";
import { useStoryCard } from "@/hooks/share/use-story-card";
import type { InboxItem } from "@/lib/drops/model";
import "@/styles/share.css";

const HINT = "Share copies your link and shows how to add it to your story as a Link sticker.";

type ShareSheetProps = {
    item: InboxItem;
    link: string;
    url: string;
    onClose: () => void;
};

export function ShareSheet({ item, link, url, onClose }: ShareSheetProps) {
    const headingRef = useRef<HTMLHeadingElement>(null);
    const shareRef = useRef<HTMLButtonElement>(null);
    const [includePhoto, setIncludePhoto] = useState(true);
    const [includePlace, setIncludePlace] = useState(true);
    const [guiding, setGuiding] = useState(false);
    const copy = useLinkShare(url);

    const card = useStoryCard(
        {
            id: item.id,
            message: item.message,
            placeName: item.location.name,
            hasPhoto: item.has_photo,
            linkUrl: url,
        },
        { includePhoto, includePlace },
    );

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    // Escape closes the panel from anywhere on the page; the guide handles its own
    useEffect(() => {
        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape" && !guiding) {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKey);

        return () => {
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose, guiding]);

    const locked = !card.ready || card.busy;

    // copy in the same tap, then open the guide
    function handleShare() {
        void copy.copy();
        setGuiding(true);
    }

    // closing the guide puts focus back on Share
    function handleCloseGuide() {
        setGuiding(false);
        shareRef.current?.focus();
    }

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
                        ref={shareRef}
                        className="auth-btn auth-btn-ink"
                        type="button"
                        disabled={locked}
                        onClick={handleShare}
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
                        {guiding ? "" : card.error}
                    </p>
                </div>
            </div>

            {guiding ? <StickerGuide card={card} link={link} copy={copy} onClose={handleCloseGuide} /> : null}
        </div>
    );
}
