// The owner's link card for the My link page: a caption, the link as large text, Copy and
// Share, and a tilted preview of the story image made from the link. Copy puts the link on the
// clipboard. Share sends the story image to the device's share sheet (or saves it where files
// cannot be shared); if the image could not be made, Share sends the plain link instead. The
// link is display text built from a checked username and is never put into an href, and the
// preview is a local image made in the browser. While the profile loads, or if it failed, the
// card says so instead.
import { Copy, InstagramLogo } from "@phosphor-icons/react";
import { useLinkShare } from "@/hooks/profiles/use-link-share";
import { useOwnLink } from "@/hooks/profiles/use-own-link";
import { useStoryCard } from "@/hooks/share/use-story-card";
import { LINK_STORY_MESSAGE } from "@/lib/share/model";

const STORY_OPTIONS = { includePhoto: false, includePlace: false };

// the card once the link is known
function LinkCardBody({ link }: { link: string }) {
    const share = useLinkShare(link);
    const card = useStoryCard(
        { id: "link", message: LINK_STORY_MESSAGE, placeName: null, hasPhoto: false, link },
        STORY_OPTIONS,
    );
    const failed = !card.ready && card.error !== "";

    // the image when it is ready, the plain link when the image failed
    function handleShare() {
        if (card.ready) {
            void card.share();

            return;
        }

        if (failed) {
            void share.share();
        }
    }

    return (
        // link card
        <div className="sub-section app-card mylink-card">
            <div className="placement auth-stack">
                <div className="container">
                    <p className="mylink-caption">Put this in your story</p>
                </div>
                <div className="container">
                    <p className="mylink-url">{link}</p>
                </div>
            </div>
            <div className="placement app-row">
                <div className="container">
                    <button
                        className="auth-btn auth-btn-paper"
                        type="button"
                        disabled={share.busy}
                        onClick={() => {
                            void share.copy();
                        }}
                    >
                        <Copy weight="bold" aria-hidden="true" />
                        Copy
                    </button>
                </div>
                <div className="container">
                    <button
                        className="auth-btn auth-btn-ink"
                        type="button"
                        disabled={(!card.ready && !failed) || card.busy || share.busy}
                        onClick={handleShare}
                    >
                        <InstagramLogo weight="bold" aria-hidden="true" />
                        Share
                    </button>
                </div>
            </div>
            <div className="placement mylink-preview">
                <div className="container mylink-story">
                    {card.previewUrl ? (
                        <img className="mylink-story-image" src={card.previewUrl} alt="Preview of your story image" />
                    ) : (
                        <p className="auth-status mylink-story-wait" role="status">
                            {failed ? "The image could not be made." : "Making the image"}
                        </p>
                    )}
                </div>
            </div>
            <div className="placement auth-stack">
                <div className="container">
                    <p className="auth-status" role="status">
                        {share.message}
                    </p>
                </div>
                <div className="container">
                    <p className="auth-error" role="alert">
                        {card.ready ? card.error : ""}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function LinkCard() {
    const own = useOwnLink();

    if (!own.link) {
        return (
            // waiting or failed
            <div className="sub-section app-card">
                <div className="placement">
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
        );
    }

    return <LinkCardBody link={own.link} />;
}
