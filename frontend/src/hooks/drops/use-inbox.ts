// The signed-in user's inbox for one filter and, when given, one statement scope ("earlier"
// for the drops from before statements), newest first, a page at a time, read from the shared
// inbox store. Page one loads on mount, on a scope change and on retry, and cancels the load
// before it. The same scope keeps its list on screen while it reloads; a new scope starts
// empty, so a list from the old scope is never shown under the new one. "Load more" appends
// the next page for the same scope behind a lock, skipping drops already shown. Each page
// brings the inbox-wide unread count, the statements behind its drops for the section headers,
// and the count of drops from before statements.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSnapshot, subscribe, update, type InboxSnapshot } from "@/hooks/drops/inbox-store";
import { ApiError } from "@/lib/api";
import { listDrops } from "@/lib/drops/api";
import type { InboxFilter } from "@/lib/drops/model";
import type { Statement } from "@/lib/statements/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

function failureMessage(error: unknown) {
    return error instanceof ApiError ? error.message : FALLBACK_MESSAGE;
}

// statements from a page added to the kept ones by id
function mergeSections(kept: Record<string, Statement>, page: Statement[]) {
    const sections = { ...kept };

    for (const statement of page) {
        sections[statement.id] = statement;
    }

    return sections;
}

function sameScope(current: InboxSnapshot, filter: InboxFilter, statement: string | undefined) {
    return current.filter === filter && current.statement === statement;
}

// a fresh, empty list for a scope that has not loaded yet
function emptyFor(current: InboxSnapshot, filter: InboxFilter, statement: string | undefined): InboxSnapshot {
    return {
        ...current,
        filter,
        statement,
        sections: {},
        earlierCount: 0,
        status: "loading",
        items: [],
        nextCursor: null,
        error: "",
        loadingMore: false,
        moreError: "",
    };
}

export function useInbox(filter: InboxFilter, statement?: string) {
    const stored = useSyncExternalStore(subscribe, getSnapshot);
    const generationRef = useRef(0);
    const moreLockRef = useRef(false);
    const moreControllerRef = useRef<AbortController | null>(null);
    const [attempt, setAttempt] = useState(0);

    // page one for this scope; any earlier load and load-more is cancelled
    useEffect(() => {
        const controller = new AbortController();
        const generation = generationRef.current + 1;

        generationRef.current = generation;
        moreControllerRef.current?.abort();
        moreControllerRef.current = null;
        moreLockRef.current = false;
        update((current) =>
            sameScope(current, filter, statement)
                ? { ...current, status: "loading", error: "", loadingMore: false, moreError: "" }
                : emptyFor(current, filter, statement),
        );

        listDrops({ filter, statement }, controller.signal).then(
            (page) => {
                if (controller.signal.aborted || generation !== generationRef.current) {
                    return;
                }

                update((current) => ({
                    ...current,
                    filter,
                    statement,
                    sections: mergeSections({}, page.statements),
                    earlierCount: page.earlier_count,
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
    }, [filter, statement, attempt]);

    function retry() {
        setAttempt((current) => current + 1);
    }

    // the next page for this scope, once; drops already shown are not repeated
    async function loadMore() {
        const kept = getSnapshot();
        const cursor = kept.nextCursor;

        if (moreLockRef.current || !cursor || !sameScope(kept, filter, statement)) {
            return;
        }

        const controller = new AbortController();
        const generation = generationRef.current;

        moreLockRef.current = true;
        moreControllerRef.current = controller;
        update((current) => ({ ...current, loadingMore: true, moreError: "" }));

        try {
            const page = await listDrops({ cursor, filter, statement }, controller.signal);

            if (generation !== generationRef.current) {
                return;
            }

            update((current) => {
                const seen = new Set(current.items.map((item) => item.id));

                return {
                    ...current,
                    items: [...current.items, ...page.items.filter((item) => !seen.has(item.id))],
                    sections: mergeSections(current.sections, page.statements),
                    earlierCount: page.earlier_count,
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

    // until the store has switched, a new scope reads as empty and loading
    const state = sameScope(stored, filter, statement) ? stored : emptyFor(stored, filter, statement);

    return { ...state, retry, loadMore };
}
