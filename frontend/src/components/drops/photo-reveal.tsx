// A drop's photo, hidden behind a blur until the owner chooses to look. The photo starts blurred
// with a "Tap to view photo" label on a button; a tap or the keyboard clears it. The image source
// is only ever the same-origin photo path built from a checked drop id, and nothing is shown when
// that check fails. The box keeps the photo's 4:5 shape at any width. A failed load shows text.
import { Image } from "@phosphor-icons/react";
import { useState } from "react";
import { dropPhotoPath } from "@/lib/drops/api";

export function PhotoReveal({ id }: { id: string }) {
    const path = dropPhotoPath(id);
    const [revealed, setRevealed] = useState(false);
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

    const image = (
        <img
            className="inbox-photo-img"
            src={path}
            alt={revealed ? "Photo sent with this drop" : ""}
            loading="lazy"
            decoding="async"
            onError={() => {
                setFailed(true);
            }}
        />
    );

    if (revealed) {
        return <div className="inbox-photo">{image}</div>;
    }

    return (
        <button
            className="inbox-photo"
            type="button"
            data-hidden="true"
            onClick={() => {
                setRevealed(true);
            }}
        >
            {image}
            <span className="inbox-photo-label">
                <Image weight="fill" aria-hidden="true" />
                Tap to view photo
            </span>
        </button>
    );
}
