// The kept inbox for this tab, shared by every part of the app that shows it: the list, the
// drop pane and the unread badge on the Inbox tab. It lives in memory only and is never
// written to storage. Readers subscribe and get a fresh snapshot on every change, so a read
// toggle or a delete on one screen shows at once on the others. The unread count is the
// server's inbox-wide number, moved by one on each local change and never below zero. Other
// keepers of drops (the map) hear each read change and delete through a change listener, and
// may set the unread count from a page they loaded. The list may be scoped to one statement
// or to the drops from before statements; the statements behind the kept drops are kept by
// id for the section headers, and a delete lowers its section's count.
import type { InboxFilter, InboxItem } from "@/lib/drops/model";
import type { Statement } from "@/lib/statements/model";

export type InboxSnapshot = {
    filter: InboxFilter;
    statement: string | undefined;
    sections: Record<string, Statement>;
    earlierCount: number;
    status: "loading" | "ready" | "error";
    items: InboxItem[];
    nextCursor: string | null;
    unreadCount: number | null;
    error: string;
    loadingMore: boolean;
    moreError: string;
};

export type DropChange = { kind: "read"; item: InboxItem } | { kind: "remove"; id: string };

const listeners = new Set<() => void>();
const changeListeners = new Set<(change: DropChange) => void>();

let snapshot: InboxSnapshot = {
    filter: "all",
    statement: undefined,
    sections: {},
    earlierCount: 0,
    status: "loading",
    items: [],
    nextCursor: null,
    unreadCount: null,
    error: "",
    loadingMore: false,
    moreError: "",
};

// listen for changes; returns the way to stop
export function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function getSnapshot() {
    return snapshot;
}

export function setSnapshot(next: InboxSnapshot) {
    snapshot = next;

    for (const listener of listeners) {
        listener();
    }
}

export function update(change: (current: InboxSnapshot) => InboxSnapshot) {
    setSnapshot(change(snapshot));
}

// hear each read change and delete; returns the way to stop
export function onDropChange(listener: (change: DropChange) => void) {
    changeListeners.add(listener);

    return () => {
        changeListeners.delete(listener);
    };
}

function emitChange(change: DropChange) {
    for (const listener of changeListeners) {
        listener(change);
    }
}

// the server's inbox-wide unread count from any page
export function setUnreadCount(count: number) {
    update((current) => ({ ...current, unreadCount: count }));
}

function shiftCount(count: number | null, by: number) {
    return count === null ? null : Math.max(0, count + by);
}

// a drop the server changed replaces its copy, and the count follows its read flag
export function applyReadChange(item: InboxItem, wasRead: boolean) {
    let by = 0;

    if (wasRead && !item.is_read) {
        by = 1;
    } else if (!wasRead && item.is_read) {
        by = -1;
    }

    update((current) => ({
        ...current,
        items: current.items.map((kept) => (kept.id === item.id ? item : kept)),
        unreadCount: shiftCount(current.unreadCount, by),
    }));

    emitChange({ kind: "read", item });
}

// a section count after one of its drops is deleted
function lowerSection(current: InboxSnapshot, id: string) {
    const removed = current.items.find((kept) => kept.id === id);

    if (!removed) {
        return current;
    }

    const section = removed.statement_id === null ? null : current.sections[removed.statement_id];

    if (removed.statement_id === null) {
        return { ...current, earlierCount: Math.max(0, current.earlierCount - 1) };
    }

    if (!section) {
        return current;
    }

    return {
        ...current,
        sections: {
            ...current.sections,
            [section.id]: { ...section, drop_count: Math.max(0, section.drop_count - 1) },
        },
    };
}

// a deleted drop leaves the list and its section count, and an unread one lowers the count
export function applyRemoval(id: string, wasUnread: boolean) {
    update((current) => ({
        ...lowerSection(current, id),
        items: current.items.filter((kept) => kept.id !== id),
        unreadCount: shiftCount(current.unreadCount, wasUnread ? -1 : 0),
    }));

    emitChange({ kind: "remove", id });
}
