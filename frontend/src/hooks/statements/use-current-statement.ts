// The owner's running statement, read from the statement store. It is loaded once per app
// session, by whichever screen asks first, and again only on retry. A load is never cancelled
// when a screen closes, because the answer belongs to the shared store. The time left counts
// down from the stored deadline, and at zero the statement is marked ended here without asking
// the server. Failures keep the server's text to show.
import { useEffect, useState, useSyncExternalStore } from "react";
import { useCountdown } from "@/hooks/statements/use-countdown";
import {
    getSnapshot,
    markEnded,
    secondsUntil,
    setCurrent,
    subscribe,
    update,
} from "@/hooks/statements/statement-store";
import { ApiError } from "@/lib/api";
import { getCurrentStatement } from "@/lib/statements/api";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export function useCurrentStatement() {
    const stored = useSyncExternalStore(subscribe, getSnapshot);
    const [attempt, setAttempt] = useState(0);
    const countdown = useCountdown(secondsUntil(stored.deadline), stored.statement?.id ?? "none");

    // the first load for this tab, or a retry
    useEffect(() => {
        const kept = getSnapshot();

        if (kept.status === "loading" || (kept.status !== "idle" && attempt === 0)) {
            return;
        }

        update((current) => ({ ...current, status: "loading", error: "" }));
        getCurrentStatement().then(
            (result) => {
                setCurrent(result.statement);
            },
            (error: unknown) => {
                const message = error instanceof ApiError ? error.message : FALLBACK_MESSAGE;

                update((current) => ({ ...current, status: "error", error: message }));
            },
        );
    }, [attempt]);

    // at zero the running statement has ended
    useEffect(() => {
        if (stored.statement && countdown.done) {
            markEnded();
        }
    }, [stored.statement, countdown.done]);

    function retry() {
        setAttempt((current) => current + 1);
    }

    return { ...stored, msLeft: countdown.msLeft, retry };
}
