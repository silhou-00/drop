// The signed-in user's inbox for one filter, newest first, a page at a time, read from the
// shared inbox store. Page one loads on mount, on a filter change and on retry, and cancels the
// load before it. The same filter keeps its list on screen while it reloads; a new filter starts
// empty, so a list from the old filter is never shown under the new one. "Load more" appends
// the next page for the same filter behind a lock, skipping drops already shown. Each page
// brings the inbox-wide unread count.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSnapshot, subscribe, update, type InboxSnapshot } from "@/hooks/drops/inbox-store";
import { ApiError } from "@/lib/api";
import { listDrops } from "@/lib/drops/api";
import type { InboxFilter } from "@/lib/drops/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

function failureMessage(error: unknown) {
    return error instanceof ApiError ? error.message : FALLBACK_MESSAGE;
}

// a fresh, empty list for a filter that has not loaded yet
function emptyFor(current: InboxSnapshot, filter: InboxFilter): InboxSnapshot {
    return {
        ...current,
        filter,
        status: "loading",
        items: [],
        nextCursor: null,
        error: "",
        loadingMore: false,
        moreError: "",
    };
}

export function useInbox(filter: InboxFilter) {
    const stored = useSyncExternalStore(subscribe, getSnapshot);
    const generationRef = useRef(0);
    const moreLockRef = useRef(false);
    const moreControllerRef = useRef<AbortController | null>(null);
    const [attempt, setAttempt] = useState(0);

    // page one for this filter; any earlier load and load-more is cancelled
    useEffect(() => {
        const controller = new AbortController();
        const generation = generationRef.current + 1;

        generationRef.current = generation;
        moreControllerRef.current?.abort();
        moreControllerRef.current = null;
        moreLockRef.current = false;
        update((current) =>
            current.filter === filter
                ? { ...current, status: "loading", error: "", loadingMore: false, moreError: "" }
                : emptyFor(current, filter),
        );

        listDrops({ filter }, controller.signal).then(
            (page) => {
                if (controller.signal.aborted || generation !== generationRef.current) {
                    return;
                }

                update((current) => ({
                    ...current,
                    filter,
                    status: "ready",
                    items: page.items,
                    nextCursor: page.next_cursor,
                    unreadCount: page.unread_count,
                    error: "",
                }));
            },
            (error: unknown) => {
                if (controller.signal.aborted || generation !== generationRef.current) {
                    return;
                }

                update((current) => ({ ...current, status: "error", error: failureMessage(error) }));
            },
        );

        return () => {
            controller.abort();
            moreControllerRef.current?.abort();
        };
    }, [filter, attempt]);

    function retry() {
        setAttempt((current) => current + 1);
    }

    // the next page for this filter, once; drops already shown are not repeated
    async function loadMore() {
        const kept = getSnapshot();
        const cursor = kept.nextCursor;

        if (moreLockRef.current || !cursor || kept.filter !== filter) {
            return;
        }

        const controller = new AbortController();
        const generation = generationRef.current;

        moreLockRef.current = true;
        moreControllerRef.current = controller;
        update((current) => ({ ...current, loadingMore: true, moreError: "" }));

        try {
            const page = await listDrops({ cursor, filter }, controller.signal);

            if (generation !== generationRef.current) {
                return;
            }

            update((current) => {
                const seen = new Set(current.items.map((item) => item.id));

                return {
                    ...current,
                    items: [...current.items, ...page.items.filter((item) => !seen.has(item.id))],
                    nextCursor: page.next_cursor,
                    unreadCount: page.unread_count,
                    loadingMore: false,
                };
            });
        } catch (error) {
            if (controller.signal.aborted || generation !== generationRef.current) {
                return;
            }

            update((current) => ({ ...current, loadingMore: false, moreError: failureMessage(error) }));
        } finally {
            if (moreControllerRef.current === controller) {
                moreControllerRef.current = null;
                moreLockRef.current = false;
            }
        }
    }

    // until the store has switched, a new filter reads as empty and loading
    const state = stored.filter === filter ? stored : emptyFor(stored, filter);

    return { ...state, retry, loadMore };
}
