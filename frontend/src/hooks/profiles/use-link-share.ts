// Copying the owner's link. Copy writes the full address to the clipboard, built from the
// site's own address so it is right on any host. One lock means a double tap copies once. The
// result is a short status line to show as text.
import { useRef, useState } from "react";

const COPIED_MESSAGE = "Your link is copied.";
const COPY_FAILED_MESSAGE = "Copy did not work. Select the link and copy it.";

export function useLinkShare(url: string) {
    const lockRef = useRef(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState("");

    // one copy at a time; nothing happens without an address
    async function copy() {
        if (lockRef.current || !url) {
            return;
        }

        lockRef.current = true;
        setBusy(true);
        setMessage("");

        try {
            await navigator.clipboard.writeText(url);
            setMessage(COPIED_MESSAGE);
        } catch {
            setMessage(COPY_FAILED_MESSAGE);
        } finally {
            lockRef.current = false;
            setBusy(false);
        }
    }

    return { copy, busy, message };
}
