// Deleting a drop for good. A lock held in a ref means a double tap sends one request, and it
// stays shut after success because the page moves on. On success the drop leaves the kept inbox
// list. A 404 means it is already gone, so it counts as deleted too. Other failures are kept as
// text to show.
import { useRef, useState } from "react";
import { removeInboxItem } from "@/hooks/drops/use-inbox";
import { ApiError } from "@/lib/api";
import { deleteDrop } from "@/lib/drops/api";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export function useDeleteDrop() {
    const lockRef = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    // resolves true once the drop is gone, false when it failed or was already deleting
    async function remove(id: string): Promise<boolean> {
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

        removeInboxItem(id);

        return true;
    }

    return { remove, pending, error };
}
