// The owner's link card for the My link page: the link as large text, with Copy and Share
// buttons and a status line. The link is display text built from a checked username and is
// never put into an href. While the profile loads, or if it failed, the card says so instead.
import { Copy, ShareFat } from "@phosphor-icons/react";
import { useLinkShare } from "@/hooks/profiles/use-link-share";
import { useOwnLink } from "@/hooks/profiles/use-own-link";

export function LinkCard() {
    const own = useOwnLink();
    const share = useLinkShare(own.link);

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

    return (
        // link card
        <div className="sub-section app-card">
            <div className="placement auth-stack">
                <div className="container">
                    <p className="auth-label">Your link</p>
                </div>
                <div className="container">
                    <p className="auth-link">{own.link}</p>
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
                        disabled={share.busy}
                        onClick={() => {
                            void share.share();
                        }}
                    >
                        <ShareFat weight="bold" aria-hidden="true" />
                        Share
                    </button>
                </div>
            </div>
            <div className="placement">
                <div className="container">
                    <p className="auth-status" role="status">
                        {share.message}
                    </p>
                </div>
            </div>
        </div>
    );
}
