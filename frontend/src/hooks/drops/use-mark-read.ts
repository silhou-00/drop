// Setting a drop read or unread. A lock held in a ref means a double tap sends one request. On
// success the shared inbox store takes the changed drop and moves the unread count, so the list,
// the "new" badge and the Inbox tab update at once, and the page gets the item the server
// answered with. The last failure is kept as text to show.
import { useRef, useState } from "react";
import { applyReadChange } from "@/hooks/drops/inbox-store";
import { ApiError } from "@/lib/api";
import { setDropRead } from "@/lib/drops/api";
import type { InboxItem } from "@/lib/drops/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export function useMarkRead() {
    const lockRef = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    // resolves with the updated drop, or null when it failed or one was already in flight
    async function mark(id: string, isRead: boolean, wasRead: boolean): Promise<InboxItem | null> {
        if (lockRef.current) {
            return null;
        }

        lockRef.current = true;
        setPending(true);
        setError("");

        try {
            const item = await setDropRead(id, isRead);

            applyReadChange(item, wasRead);

            return item;
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : FALLBACK_MESSAGE);

            return null;
        } finally {
            lockRef.current = false;
            setPending(false);
        }
    }

    return { mark, pending, error };
}
