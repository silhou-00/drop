// The signed-in user's inbox, newest first, a page at a time. The first page loads when the page
// mounts (and again on retry); "Load more" appends the next page while the server returns a
// cursor, behind a lock so a double tap fetches it once. The list is kept in memory for this tab
// only, so coming back from a drop shows it at once while page one reloads, and the read and
// delete hooks patch it so the list never shows a stale flag or a deleted drop.
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { listDrops } from "@/lib/drops/api";
import type { InboxItem } from "@/lib/drops/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

type InboxCache = { items: InboxItem[]; nextCursor: string | null };

export type InboxState = {
    status: "loading" | "ready" | "error";
    items: InboxItem[];
    nextCursor: string | null;
    error: string;
    loadingMore: boolean;
    moreError: string;
};

let cache: InboxCache | null = null;

// a changed drop replaces its copy in the kept list
export function patchInboxItem(item: InboxItem) {
    if (!cache) {
        return;
    }

    cache = { ...cache, items: cache.items.map((current) => (current.id === item.id ? item : current)) };
}

// a deleted drop leaves the kept list
export function removeInboxItem(id: string) {
    if (!cache) {
        return;
    }

    cache = { ...cache, items: cache.items.filter((current) => current.id !== id) };
}

function failureMessage(error: unknown) {
    return error instanceof ApiError ? error.message : FALLBACK_MESSAGE;
}

function initialState(): InboxState {
    if (cache) {
        return { status: "ready", ...cache, error: "", loadingMore: false, moreError: "" };
    }

    return { status: "loading", items: [], nextCursor: null, error: "", loadingMore: false, moreError: "" };
}

export function useInbox() {
    const moreLockRef = useRef(false);
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<InboxState>(initialState);

    // page one, again on every retry; a kept list stays on screen until it arrives
    useEffect(() => {
        const controller = new AbortController();

        listDrops({}, controller.signal).then(
            (page) => {
                cache = { items: page.items, nextCursor: page.next_cursor };
                setState({ status: "ready", ...cache, error: "", loadingMore: false, moreError: "" });
            },
            (error: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                setState((current) => ({ ...current, status: "error", error: failureMessage(error) }));
            },
        );

        return () => {
            controller.abort();
        };
    }, [attempt]);

    function retry() {
        setState((current) => ({ ...current, status: "loading", error: "" }));
        setAttempt((current) => current + 1);
    }

    // the next page, once; items already shown are not repeated
    async function loadMore() {
        const cursor = state.nextCursor;

        if (moreLockRef.current || !cursor) {
            return;
        }

        moreLockRef.current = true;
        setState((current) => ({ ...current, loadingMore: true, moreError: "" }));

        try {
            const page = await listDrops({ cursor });

            setState((current) => {
                const seen = new Set(current.items.map((item) => item.id));
                const items = [...current.items, ...page.items.filter((item) => !seen.has(item.id))];

                cache = { items, nextCursor: page.next_cursor };

                return { ...current, ...cache, loadingMore: false };
            });
        } catch (error) {
            setState((current) => ({ ...current, loadingMore: false, moreError: failureMessage(error) }));
        } finally {
            moreLockRef.current = false;
        }
    }

    return { ...state, retry, loadMore };
}
