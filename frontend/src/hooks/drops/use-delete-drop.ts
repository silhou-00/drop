// Deleting a drop for good. A lock held in a ref means a double tap sends one request, and it
// stays shut after success because the page moves on. On success the drop leaves the shared
// inbox store, and an unread one lowers the unread count. A 404 means it is already gone, so it
// counts as deleted too. Other failures are kept as text to show.
import { useRef, useState } from "react";
import { applyRemoval } from "@/hooks/drops/inbox-store";
import { ApiError } from "@/lib/api";
import { deleteDrop } from "@/lib/drops/api";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export function useDeleteDrop() {
    const lockRef = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    // resolves true once the drop is gone, false when it failed or was already deleting
    async function remove(id: string, wasUnread: boolean): Promise<boolean> {
        if (lockRef.current) {
            return false;
        }

        lockRef.current = true;
        setPending(true);
        setError("");

        try {
            await deleteDrop(id);
        } catch (caught) {
            if (!(caught instanceof ApiError && caught.status === 404)) {
                lockRef.current = false;
                setPending(false);
                setError(caught instanceof ApiError ? caught.message : FALLBACK_MESSAGE);

                return false;
            }
        }

        applyRemoval(id, wasUnread);

        return true;
    }

    return { remove, pending, error };
}
