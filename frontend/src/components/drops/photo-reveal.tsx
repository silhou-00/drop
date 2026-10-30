// A drop's photo in a ringed circle, hidden behind a blur until the owner chooses to look. The
// first tap clears the blur; the next opens the whole photo uncropped in a 4:5 frame across
// the media row, and another tap shrinks it back to the circle. It is one button throughout,
// so the keyboard works the same way. The image source is only ever the same-origin photo
// path built from a checked drop id, and nothing is shown when that check fails.
import { Image } from "@phosphor-icons/react";
import { useState } from "react";
import { dropPhotoPath } from "@/lib/drops/api";

type Stage = "hidden" | "shown" | "full";

const OPEN_LABEL = "Photo sent with this drop. Open it full size";
const CLOSE_LABEL = "Photo sent with this drop. Make it smaller";

export function PhotoReveal({ id }: { id: string }) {
    const path = dropPhotoPath(id);
    const [stage, setStage] = useState<Stage>("hidden");
    const [failed, setFailed] = useState(false);

    if (!path) {
        return null;
    }

    if (failed) {
        return (
            <p className="inbox-photo-failed" role="status">
                The photo could not be loaded.
            </p>
        );
    }

    // hidden, then shown, then full and back to shown
    function handleTap() {
        setStage((current) => (current === "shown" ? "full" : "shown"));
    }

    let label: string | undefined;

    if (stage === "shown") {
        label = OPEN_LABEL;
    } else if (stage === "full") {
        label = CLOSE_LABEL;
    }

    return (
        <button
            className="inbox-photo"
            type="button"
            data-stage={stage}
            aria-label={label}
            aria-expanded={stage === "hidden" ? undefined : stage === "full"}
            onClick={handleTap}
        >
            <img
                className="inbox-photo-img"
                src={path}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => {
                    setFailed(true);
                }}
            />
            {stage === "hidden" ? (
                <span className="inbox-photo-label">
                    <Image weight="fill" aria-hidden="true" />
                    Tap to view photo
                </span>
            ) : null}
        </button>
    );
}
