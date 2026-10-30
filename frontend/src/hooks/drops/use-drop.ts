// One drop from the signed-in user's inbox, for the detail page. The id is checked as a UUID
// first, so a malformed id is not-found without a request. The server answers 404 for a missing
// drop and for someone else's, and both show the same not-found view. The request is cancelled
// when the id changes or the page leaves. The page swaps in the item a read toggle returns.
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getDrop } from "@/lib/drops/api";
import { isDropId, type InboxItem } from "@/lib/drops/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export type DropState =
    | { status: "loading" }
    | { status: "ready"; item: InboxItem }
    | { status: "not-found" }
    | { status: "signed-out" }
    | { status: "error"; message: string };

const LOADING: DropState = { status: "loading" };
const NOT_FOUND: DropState = { status: "not-found" };

export function useDrop(id: string) {
    const valid = isDropId(id);
    const [attempt, setAttempt] = useState(0);
    const [result, setResult] = useState<{ id: string; attempt: number; state: DropState } | null>(null);

    useEffect(() => {
        if (!valid) {
            return;
        }

        const controller = new AbortController();

        getDrop(id, controller.signal).then(
            (item) => {
                setResult({ id, attempt, state: { status: "ready", item } });
            },
            (error: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                let state: DropState;

                if (error instanceof ApiError && error.status === 404) {
                    state = NOT_FOUND;
                } else if (error instanceof ApiError && error.status === 401) {
                    state = { status: "signed-out" };
                } else {
                    state = { status: "error", message: error instanceof ApiError ? error.message : FALLBACK_MESSAGE };
                }

                setResult({ id, attempt, state });
            },
        );

        return () => {
            controller.abort();
        };
    }, [id, valid, attempt]);

    function retry() {
        setAttempt((current) => current + 1);
    }

    // the item a read toggle answered with
    function update(item: InboxItem) {
        setResult((current) =>
            current && current.id === item.id ? { ...current, state: { status: "ready", item } } : current,
        );
    }

    // a result for an earlier id or attempt counts as loading
    const state = !valid
        ? NOT_FOUND
        : result && result.id === id && result.attempt === attempt
          ? result.state
          : LOADING;

    return { state, retry, update };
}
