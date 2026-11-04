// Builds the story card for one drop and holds it as a PNG with a blob URL for the preview. The
// card is rebuilt when the options change, and each blob URL is revoked when it is replaced or
// the panel closes. The photo is loaded once from the drop's same-origin photo path; a failed
// load leaves the card without it. Share first writes the owner's full address to the
// clipboard again, in the same tap, so it is ready to paste into the Link sticker. Then it
// hands the file to the device's share sheet when the browser can share files, and otherwise
// (in-app browsers) saves it and leaves a notice saying what to do next. A ref
// lock stops a double click from firing twice; a cancelled share is not an error. Nothing is
// uploaded or stored. The drawing code loads on first use, so a page that offers a card does
// not carry it up front.
import { useEffect, useRef, useState } from "react";
import { dropPhotoPath } from "@/lib/drops/api";
import { DOWNLOAD_LOCK_MS, STORY_FILE_NAME, STORY_FILE_TYPE, type StoryOptions } from "@/lib/share/model";

const BUILD_FAILED_MESSAGE = "The image could not be made. Close this and try again.";
const SHARE_FAILED_MESSAGE = "Sharing did not work. Use Save image instead.";

export type StorySource = {
    id: string;
    message: string;
    placeName: string | null;
    hasPhoto: boolean;
    linkUrl: string;
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

const SAVED_NOTICE = "Image saved. Open Instagram or Facebook, add it to your story, then add a Link sticker.";

function isAbort(error: unknown) {
    return error instanceof DOMException && error.name === "AbortError";
}

export function useStoryCard(source: StorySource, options: StoryOptions) {
    const { id, message, placeName, hasPhoto, linkUrl } = source;
    const { includePhoto, includePlace } = options;
    const lockRef = useRef(false);
    const timerRef = useRef(0);
    const [photo, setPhoto] = useState<PhotoResult | null>(null);
    const [card, setCard] = useState<CardResult | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const photoPath = hasPhoto ? dropPhotoPath(id) : null;
    const photoSettled = !photoPath || (photo !== null && photo.id === id);
    const image = photoPath && photo && photo.id === id ? photo.image : null;
    const key = [id, message, placeName, includePhoto, includePlace, photoSettled, image !== null].join("|");

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

        import("@/lib/share/render")
            .then(({ renderStoryCard }) =>
                renderStoryCard({ message, placeName, photo: image }, { includePhoto, includePlace }),
            )
            .then(
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
    }, [key, message, placeName, image, includePhoto, includePlace, photoSettled]);

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
        setNotice("");

        return current;
    }

    // the address goes on the clipboard in the same tap, without waiting, so the share keeps it
    async function share() {
        const taken = take();

        if (!taken || !taken.blob) {
            return;
        }

        const file = new File([taken.blob], STORY_FILE_NAME, { type: STORY_FILE_TYPE });

        navigator.clipboard?.writeText(linkUrl).catch(() => undefined);

        if (!navigator.canShare?.({ files: [file] })) {
            saveNow(taken.url);
            setNotice(SAVED_NOTICE);

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
        notice,
        share,
        save,
    };
}
