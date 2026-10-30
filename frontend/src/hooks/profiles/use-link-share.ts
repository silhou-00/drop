// Copying and sharing the owner's link. Copy writes the full https address to the clipboard.
// Share opens the phone's share sheet with the address when the browser has one, and copies
// otherwise or when sharing fails; closing the sheet without sharing says nothing. One lock
// covers both, so a double tap runs once. The result is a short status line to show as text.
import { useRef, useState } from "react";

const COPIED_MESSAGE = "Link copied.";
const COPY_FAILED_MESSAGE = "Copy did not work. Select the link and copy it.";

export function useLinkShare(link: string) {
    const lockRef = useRef(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");

    async function writeLink() {
        try {
            await navigator.clipboard.writeText(`https://${link}`);
            setMessage(COPIED_MESSAGE);
        } catch {
            setMessage(COPY_FAILED_MESSAGE);
        }
    }

    // runs one action at a time; nothing happens without a link
    async function guarded(action: () => Promise<void>) {
        if (lockRef.current || !link) {
            return;
        }

        lockRef.current = true;
        setBusy(true);
        setMessage("");

        try {
            await action();
        } finally {
            lockRef.current = false;
            setBusy(false);
        }
    }

    async function copy() {
        await guarded(writeLink);
    }

    async function share() {
        await guarded(async () => {
            if (typeof navigator.share !== "function") {
                await writeLink();

                return;
            }

            try {
                await navigator.share({ url: `https://${link}` });
            } catch (caught) {
                if (caught instanceof DOMException && caught.name === "AbortError") {
                    return;
                }

                await writeLink();
            }
        });
    }

    return { copy, share, busy, message };
}
