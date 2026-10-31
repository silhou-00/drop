// Starting a statement, which opens the owner's link for a fixed time and ends any statement
// already running. The text is checked with the shared rule first, and a failure there shows
// the same message the server would, with no request. A lock held in a ref means a double click
// starts one statement. On success the new statement becomes the current one in the shared
// store. Failures, including the wait after too many tries, keep the server's text to show.
import { useRef, useState } from "react";
import { setCurrent } from "@/hooks/statements/statement-store";
import { ApiError } from "@/lib/api";
import { startStatement } from "@/lib/statements/api";
import { checkStatement } from "@/lib/statements/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export function useStartStatement() {
    const lockRef = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    // resolves true once the statement is running, false when it failed or was already starting
    async function start(text: string): Promise<boolean> {
        if (lockRef.current) {
            return false;
        }

        const check = checkStatement(text);

        if (!check.ok) {
            setError(check.message);

            return false;
        }

        lockRef.current = true;
        setPending(true);
        setError("");

        try {
            setCurrent(await startStatement(check.value));

            return true;
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : FALLBACK_MESSAGE);

            return false;
        } finally {
            lockRef.current = false;
            setPending(false);
        }
    }

    return { start, pending, error };
}
