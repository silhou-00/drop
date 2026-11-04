// The signed-in user's drops for the map, read from the map store. On mount it reuses a load
// that finished in the last minute; otherwise it loads a few pages of the "all" list one after another,
// keeping what is already on screen until the new pages arrive. The map shows as soon as page
// one is in, while the rest keep coming. "Load older drops" adds a few more pages behind a lock,
// up to a cap. A failure never retries on its own: a failed first page shows the server's text
// (including the wait after too many requests), and a later failed page keeps what loaded.
// Each page also brings the statements behind its drops and the count from before statements,
// kept for the statement picker. A live refresh reads page one again and puts new drops and
// statements in front of the kept ones, only while the map is loaded.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { setUnreadCount } from "@/hooks/drops/inbox-store";
import { getSnapshot, subscribe, updateMap, type MapSnapshot } from "@/hooks/drops/map-store";
import { ApiError } from "@/lib/api";
import { listDrops } from "@/lib/drops/api";
import { MAP_AUTO_PAGES, MAP_FRESH_MS, MAP_MAX_DROPS, MAP_PAGE_SIZE, type InboxItem } from "@/lib/drops/model";
import type { InboxPage } from "@/lib/drops/model";
import type { Statement } from "@/lib/statements/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

function failureMessage(error: unknown) {
    return error instanceof ApiError ? error.message : FALLBACK_MESSAGE;
}

// kept drops plus a page, without repeats
function merge(kept: InboxItem[], page: InboxItem[]) {
    const seen = new Set(kept.map((item) => item.id));

    return [...kept, ...page.filter((item) => !seen.has(item.id))];
}

// kept statements with a page's, a fresh copy replacing an old one in place
function mergeStatements(kept: Statement[], page: Statement[]) {
    const fresh = new Map(page.map((statement) => [statement.id, statement]));
    const seen = new Set(kept.map((statement) => statement.id));

    return [
        ...kept.map((statement) => fresh.get(statement.id) ?? statement),
        ...page.filter((statement) => !seen.has(statement.id)),
    ];
}

// page one again; new drops and statements go in front, failures are silent
export async function refreshMap(signal: AbortSignal): Promise<void> {
    if (getSnapshot().status !== "ready") {
        return;
    }

    let page: InboxPage;

    try {
        page = await listDrops({ limit: MAP_PAGE_SIZE }, signal);
    } catch {
        return;
    }

    if (signal.aborted) {
        return;
    }

    setUnreadCount(page.unread_count);
    updateMap((current) => {
        if (current.status !== "ready") {
            return current;
        }

        const kept = new Set(current.items.map((item) => item.id));
        const keptStatements = new Set(current.statements.map((statement) => statement.id));
        const fresh = new Map(page.statements.map((statement) => [statement.id, statement]));
        const statements = [
            ...page.statements.filter((statement) => !keptStatements.has(statement.id)),
            ...current.statements.map((statement) => fresh.get(statement.id) ?? statement),
        ];

        // a page that shares nothing with the kept list has a gap behind it, so it replaces the list
        if (!page.items.some((item) => kept.has(item.id)) && page.next_cursor !== null) {
            return {
                ...current,
                items: page.items,
                statements,
                earlierCount: page.earlier_count,
                nextCursor: page.next_cursor,
            };
        }

        return {
            ...current,
            items: [...page.items.filter((item) => !kept.has(item.id)), ...current.items],
            statements,
            earlierCount: page.earlier_count,
        };
    });
}

export function useMapDrops(): MapSnapshot & { retry: () => void; loadOlder: () => Promise<void> } {
    const stored = useSyncExternalStore(subscribe, getSnapshot);
    const generationRef = useRef(0);
    const olderLockRef = useRef(false);
    const olderControllerRef = useRef<AbortController | null>(null);
    const [attempt, setAttempt] = useState(0);

    // the first pages, unless a recent load is still kept
    useEffect(() => {
        const kept = getSnapshot();

        if (attempt === 0 && kept.status === "ready" && Date.now() - kept.loadedAt < MAP_FRESH_MS) {
            return;
        }

        const controller = new AbortController();
        const generation = generationRef.current + 1;

        generationRef.current = generation;
        olderControllerRef.current?.abort();
        olderControllerRef.current = null;
        olderLockRef.current = false;
        updateMap((current) => ({
            ...current,
            status: current.status === "ready" ? "ready" : "loading",
            error: "",
            loadingMore: true,
            moreError: "",
        }));

        // pages one after another; the first replaces what was kept
        async function run() {
            let cursor: string | null = null;
            let items: InboxItem[] = [];
            let statements: Statement[] = [];

            for (let page = 0; page < MAP_AUTO_PAGES; page += 1) {
                try {
                    const result = await listDrops({ cursor, limit: MAP_PAGE_SIZE }, controller.signal);

                    if (controller.signal.aborted || generation !== generationRef.current) {
                        return;
                    }

                    items = merge(items, result.items);
                    statements = mergeStatements(statements, result.statements);
                    cursor = result.next_cursor;
                    setUnreadCount(result.unread_count);
                    updateMap((current) => ({
                        ...current,
                        status: "ready",
                        items,
                        statements,
                        earlierCount: result.earlier_count,
                        nextCursor: cursor,
                        error: "",
                    }));
                } catch (error) {
                    if (controller.signal.aborted || generation !== generationRef.current) {
                        return;
                    }

                    const message = failureMessage(error);

                    updateMap((current) =>
                        page === 0
                            ? { ...current, status: "error", error: message, loadingMore: false }
                            : { ...current, loadingMore: false, moreError: message },
                    );

                    return;
                }

                if (!cursor) {
                    break;
                }
            }

            updateMap((current) => ({ ...current, loadingMore: false, loadedAt: Date.now() }));
        }

        run();

        // a load cut short is not reused as fresh
        return () => {
            controller.abort();
            olderControllerRef.current?.abort();
            updateMap((current) => (current.loadingMore ? { ...current, loadingMore: false } : current));
        };
    }, [attempt]);

    function retry() {
        setAttempt((current) => current + 1);
    }

    // a few more pages, one run at a time, up to the cap
    async function loadOlder() {
        const kept = getSnapshot();

        if (olderLockRef.current || kept.loadingMore || !kept.nextCursor || kept.items.length >= MAP_MAX_DROPS) {
            return;
        }

        const controller = new AbortController();
        const generation = generationRef.current;
        let cursor: string | null = kept.nextCursor;

        olderLockRef.current = true;
        olderControllerRef.current = controller;
        updateMap((current) => ({ ...current, loadingMore: true, moreError: "" }));

        try {
            for (let page = 0; page < MAP_AUTO_PAGES && cursor; page += 1) {
                if (getSnapshot().items.length >= MAP_MAX_DROPS) {
                    break;
                }

                const result = await listDrops({ cursor, limit: MAP_PAGE_SIZE }, controller.signal);

                if (generation !== generationRef.current) {
                    return;
                }

                cursor = result.next_cursor;
                setUnreadCount(result.unread_count);
                updateMap((current) => ({
                    ...current,
                    items: merge(current.items, result.items),
                    statements: mergeStatements(current.statements, result.statements),
                    earlierCount: result.earlier_count,
                    nextCursor: cursor,
                }));
            }

            updateMap((current) => ({ ...current, loadingMore: false }));
        } catch (error) {
            if (controller.signal.aborted || generation !== generationRef.current) {
                return;
            }

            updateMap((current) => ({ ...current, loadingMore: false, moreError: failureMessage(error) }));
        } finally {
            if (olderControllerRef.current === controller) {
                olderControllerRef.current = null;
                olderLockRef.current = false;
            }
        }
    }

    return { ...stored, retry, loadOlder };
}
