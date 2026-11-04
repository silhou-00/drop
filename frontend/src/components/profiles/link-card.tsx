// The two steps on My link. Step 1 shows the owner's link as text with "Copy link". Step 2 is
// Share, under a small tilted preview of the story image made from the chosen statement card
// and the Style controls that restyle it.
// Share starts that statement first when it is not the one already running (a note says when
// this ends the current one), copies the link in the same tap, then opens the sticker guide,
// which walks the owner through adding the link to their story and shares the image. Typed
// text is checked with the shared rule before any request and its error shows here. The hooks'
// locks mean a double tap starts, copies or shares once. The link is display text built from a
// checked username and is never put into an href, and the preview is a local image made in the
// browser. While the profile loads, or if it failed, the card says so instead.
import { Link, ShareFat } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import { StickerGuide } from "@/components/share/sticker-guide";
import { StoryStyleControls } from "@/components/share/story-style-controls";
import { useLinkShare } from "@/hooks/profiles/use-link-share";
import { useOwnLink } from "@/hooks/profiles/use-own-link";
import { useStoryCard } from "@/hooks/share/use-story-card";
import { useStoryStyle } from "@/hooks/share/use-story-style";
import { useCurrentStatement } from "@/hooks/statements/use-current-statement";
import { useStartStatement } from "@/hooks/statements/use-start-statement";
import { durationLabel } from "@/lib/statements/helper";
import { checkStatement, normalizeStatement } from "@/lib/statements/model";

const STORY_OPTIONS = { includePhoto: false, includePlace: false };
const PREVIEW_PLACEHOLDER = "Ask your followers something";

type LinkCardProps = { text: string };

type LinkStepsProps = { link: string; url: string; text: string };

// the steps once the link is known
function LinkSteps({ link, url, text }: LinkStepsProps) {
    const share = useLinkShare(url);
    const current = useCurrentStatement();
    const startStatement = useStartStatement();
    const shareRef = useRef<HTMLButtonElement>(null);
    const [guiding, setGuiding] = useState(false);
    const { style } = useStoryStyle();
    const value = normalizeStatement(text);
    const running = current.statement;
    const needsStart = !running || running.text !== value;
    const replaces = running !== null && needsStart;
    const card = useStoryCard(
        { id: "link", message: value || PREVIEW_PLACEHOLDER, placeName: null, hasPhoto: false, linkUrl: url },
        { ...STORY_OPTIONS, style },
    );
    const failed = !card.ready && card.error !== "";

    // start the chosen statement if needed, copy in the same tap, then open the guide
    async function handleShare() {
        if (startStatement.pending || current.status !== "ready") {
            return;
        }

        if (needsStart && !checkStatement(text).ok) {
            void startStatement.start(text);

            return;
        }

        void share.copy();

        if (needsStart && !(await startStatement.start(text))) {
            return;
        }

        setGuiding(true);
    }

    // closing the guide puts focus back on Share
    function handleCloseGuide() {
        setGuiding(false);
        shareRef.current?.focus();
    }

    return (
        // steps card
        <div className="sub-section app-card mylink-card">
            {/* step 1 */}
            <div className="placement auth-stack">
                <div className="container">
                    <h2 className="mylink-step">Step 1: Copy your link</h2>
                </div>
                <div className="container">
                    <p className="mylink-url">{link.replace("/", "/​")}</p>
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
                        <Link weight="bold" aria-hidden="true" />
                        Copy link
                    </button>
                </div>
            </div>

            {/* step 2 */}
            <div className="placement auth-stack">
                <div className="container">
                    <h2 className="mylink-step">Step 2: Share link on your story</h2>
                </div>
            </div>

            {/* story preview */}
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

            <StoryStyleControls />

            {/* share */}
            <div className="placement auth-stack">
                {needsStart ? (
                    <div className="container">
                        <p className="auth-note">
                            {replaces
                                ? `This ends your current statement and opens your link for ${durationLabel()}.`
                                : `Share opens your link for ${durationLabel()}.`}
                        </p>
                    </div>
                ) : null}
                <div className="container">
                    <button
                        ref={shareRef}
                        className="auth-btn auth-btn-ink mylink-share"
                        type="button"
                        disabled={startStatement.pending || current.status !== "ready"}
                        onClick={() => {
                            void handleShare();
                        }}
                    >
                        {startStatement.pending ? (
                            <span className="auth-spin" aria-hidden="true" />
                        ) : (
                            <ShareFat weight="bold" aria-hidden="true" />
                        )}
                        {startStatement.pending ? "Opening" : "Share"}
                    </button>
                </div>
                <div className="container">
                    <p id="statement-error" className="auth-error" role="alert">
                        {startStatement.error}
                    </p>
                </div>
                <div className="container">
                    <p className="auth-status" role="status">
                        {guiding ? "" : share.message}
                    </p>
                </div>
            </div>

            {guiding ? <StickerGuide card={card} link={link} copy={share} onClose={handleCloseGuide} /> : null}
        </div>
    );
}

export function LinkCard({ text }: LinkCardProps) {
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

    return <LinkSteps link={own.link} url={own.url} text={text} />;
}
