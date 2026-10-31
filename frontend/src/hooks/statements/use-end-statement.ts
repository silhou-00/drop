// Ending the running statement early, which closes the owner's link at once. A lock held in a
// ref means a double click sends one request. On success the link reads as closed in the shared
// store. A 409 means the statement had already ended, so the link is closed too and the
// server's message says so. Other failures keep the server's text to show.
import { useRef, useState } from "react";
import { setCurrent } from "@/hooks/statements/statement-store";
import { ApiError } from "@/lib/api";
import { endStatement } from "@/lib/statements/api";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export function useEndStatement() {
    const lockRef = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    // resolves true once the link is closed, false when it failed or was already ending
    async function end(id: string): Promise<boolean> {
        if (lockRef.current) {
            return false;
        }

        lockRef.current = true;
        setPending(true);
        setError("");

        try {
            await endStatement(id);
            setCurrent(null);

            return true;
        } catch (caught) {
            if (caught instanceof ApiError && caught.status === 409 && caught.code === "STATEMENT_ENDED") {
                setCurrent(null);
                setError(caught.message);

                return true;
            }

            setError(caught instanceof ApiError ? caught.message : FALLBACK_MESSAGE);

            return false;
        } finally {
            lockRef.current = false;
            setPending(false);
        }
    }

    return { end, pending, error };
}
