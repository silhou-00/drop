// Builds the story card for one drop and holds it as a PNG with a blob URL for the preview. The
// card is rebuilt when the options change, and each blob URL is revoked when it is replaced or
// the panel closes. The photo is loaded once from the drop's same-origin photo path; a failed
// load leaves the card without it. Share hands the file to the device's share sheet when the
// browser can share files, and otherwise saves it, like Save. A ref lock stops a double click
// from firing twice; a cancelled share is not an error. Nothing is uploaded or stored.
import { useEffect, useRef, useState } from "react";
import { dropPhotoPath } from "@/lib/drops/api";
import { DOWNLOAD_LOCK_MS, STORY_FILE_NAME, STORY_FILE_TYPE, type StoryOptions } from "@/lib/share/model";
import { renderStoryCard } from "@/lib/share/render";

const BUILD_FAILED_MESSAGE = "The image could not be made. Close this and try again.";
const SHARE_FAILED_MESSAGE = "Sharing did not work. Use Save image instead.";

export type StorySource = {
    id: string;
    message: string;
    placeName: string | null;
    hasPhoto: boolean;
    link: string;
};

type PhotoResult = { id: string; image: HTMLImageElement | null };

type CardResult = { key: string; url: string; blob: Blob | null; failed: boolean };

// start a download of the blob URL through a temporary link
function download(url: string) {
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = STORY_FILE_NAME;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
}

function isAbort(error: unknown) {
    return error instanceof DOMException && error.name === "AbortError";
}

export function useStoryCard(source: StorySource, options: StoryOptions) {
    const { id, message, placeName, hasPhoto, link } = source;
    const { includePhoto, includePlace } = options;
    const lockRef = useRef(false);
    const timerRef = useRef(0);
    const [photo, setPhoto] = useState<PhotoResult | null>(null);
    const [card, setCard] = useState<CardResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const photoPath = hasPhoto ? dropPhotoPath(id) : null;
    const photoSettled = !photoPath || (photo !== null && photo.id === id);
    const image = photoPath && photo && photo.id === id ? photo.image : null;
    const key = [id, message, placeName, link, includePhoto, includePlace, photoSettled, image !== null].join("|");

    // the photo once per drop, from its same-origin path
    useEffect(() => {
        if (!photoPath) {
            return;
        }

        let cancelled = false;
        const element = new Image();

        element.src = photoPath;
        element.decode().then(
            () => {
                if (!cancelled) {
                    setPhoto({ id, image: element });
                }
            },
            () => {
                if (!cancelled) {
                    setPhoto({ id, image: null });
                }
            },
        );

        return () => {
            cancelled = true;
        };
    }, [id, photoPath]);

    // the card, rebuilt for every change; the URL it made is revoked on the next run
    useEffect(() => {
        if (!photoSettled) {
            return;
        }

        let cancelled = false;
        let url = "";

        renderStoryCard({ message, placeName, photo: image, link }, { includePhoto, includePlace }).then(
            (blob) => {
                if (cancelled) {
                    return;
                }

                url = URL.createObjectURL(blob);
                setCard({ key, url, blob, failed: false });
            },
            () => {
                if (!cancelled) {
                    setCard({ key, url: "", blob: null, failed: true });
                }
            },
        );

        return () => {
            cancelled = true;

            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [key, message, placeName, image, link, includePhoto, includePlace, photoSettled]);

    // a pending lock release does not outlive the panel
    useEffect(() => {
        return () => {
            window.clearTimeout(timerRef.current);
        };
    }, []);

    const current = card && card.key === key ? card : null;
    const ready = current !== null && current.blob !== null;

    function release() {
        lockRef.current = false;
        setBusy(false);
    }

    // a download keeps the lock a moment, so a second click of a double click does nothing
    function saveNow(url: string) {
        download(url);
        timerRef.current = window.setTimeout(release, DOWNLOAD_LOCK_MS);
    }

    function take() {
        if (lockRef.current || !current || !current.blob) {
            return null;
        }

        lockRef.current = true;
        setBusy(true);
        setError("");

        return current;
    }

    async function share() {
        const taken = take();

        if (!taken || !taken.blob) {
            return;
        }

        const file = new File([taken.blob], STORY_FILE_NAME, { type: STORY_FILE_TYPE });

        if (!navigator.canShare?.({ files: [file] })) {
            saveNow(taken.url);
            return;
        }

        try {
            await navigator.share({ files: [file] });
        } catch (caught) {
            if (!isAbort(caught)) {
                setError(SHARE_FAILED_MESSAGE);
            }
        }

        release();
    }

    function save() {
        const taken = take();

        if (taken) {
            saveNow(taken.url);
        }
    }

    return {
        previewUrl: current?.url ?? "",
        ready,
        busy,
        photoAvailable: image !== null,
        error: current?.failed ? BUILD_FAILED_MESSAGE : error,
        share,
        save,
    };
}
