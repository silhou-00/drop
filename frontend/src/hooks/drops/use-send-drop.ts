// Sending a drop to one profile. The draft is checked with the shared rules first, and a
// failure there becomes a 422 error with no request. A lock held in a ref means a double click
// can never fire two requests. A 409 LINK_PAUSED marks the link as paused. The server checks
// every rule again.
import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { sendDrop } from "@/lib/drops/api";
import { validateDraft, type DropDraft } from "@/lib/drops/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export type SendDropStatus = "idle" | "sending" | "sent" | "error";

export function useSendDrop(username: string) {
    const lockRef = useRef(false);
    const [status, setStatus] = useState<SendDropStatus>("idle");
    const [error, setError] = useState<ApiError | null>(null);
    const [paused, setPaused] = useState(false);

    // runs one send; a second call while one is in flight does nothing
    async function send(draft: DropDraft) {
        if (lockRef.current) {
            return;
        }

        const check = validateDraft(draft);

        if (!check.ok) {
            setStatus("error");
            setError(new ApiError(422, "VALIDATION_ERROR", check.message));

            return;
        }

        lockRef.current = true;
        setStatus("sending");
        setError(null);

        try {
            await sendDrop(username, draft);
            setStatus("sent");
        } catch (caught) {
            const failure = caught instanceof ApiError ? caught : new ApiError(0, "UNKNOWN_ERROR", FALLBACK_MESSAGE);

            if (failure.status === 409 && failure.code === "LINK_PAUSED") {
                setPaused(true);
            }

            setStatus("error");
            setError(failure);
        } finally {
            lockRef.current = false;
        }
    }

    function reset() {
        setStatus("idle");
        setError(null);
    }

    return { status, error, paused, send, reset };
}
