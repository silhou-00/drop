// The example photo on the landing's inbox preview, working the way a drop's photo does in the
// inbox: a ringed circle behind a blur until tapped. The first tap clears the blur; the next
// opens the whole photo in a 4:5 frame, and another tap shrinks it back. It is one button
// throughout, with the same labels as the real one. The image is a fixed same-origin file.
import { Image } from "@phosphor-icons/react";
import { useState } from "react";

type Stage = "hidden" | "shown" | "full";

const PHOTO_SRC = "/landing/example-photo.webp";
const OPEN_LABEL = "Photo sent with this drop. Open it full size";
const CLOSE_LABEL = "Photo sent with this drop. Make it smaller";

export function ExamplePhoto() {
    const [stage, setStage] = useState<Stage>("hidden");

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
            className="preview-photo"
            type="button"
            data-stage={stage}
            aria-label={label}
            aria-expanded={stage === "hidden" ? undefined : stage === "full"}
            onClick={handleTap}
        >
            <img className="preview-photo-img" src={PHOTO_SRC} alt="" loading="lazy" decoding="async" />
            {stage === "hidden" ? (
                <span className="preview-photo-label">
                    <Image weight="fill" aria-hidden="true" />
                    Tap to view photo
                </span>
            ) : null}
        </button>
    );
}
