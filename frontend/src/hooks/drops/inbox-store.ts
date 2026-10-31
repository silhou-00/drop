// The kept inbox for this tab, shared by every part of the app that shows it: the list, the
// drop pane and the unread badge on the Inbox tab. It lives in memory only and is never
// written to storage. Readers subscribe and get a fresh snapshot on every change, so a read
// toggle or a delete on one screen shows at once on the others. The unread count is the
// server's inbox-wide number, moved by one on each local change and never below zero. Other
// keepers of drops (the map) hear each read change and delete through a change listener, and
// may set the unread count from a page they loaded.
import type { InboxFilter, InboxItem } from "@/lib/drops/model";

export type InboxSnapshot = {
    filter: InboxFilter;
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

// a deleted drop leaves the list, and an unread one lowers the count
export function applyRemoval(id: string, wasUnread: boolean) {
    update((current) => ({
        ...current,
        items: current.items.filter((kept) => kept.id !== id),
        unreadCount: shiftCount(current.unreadCount, wasUnread ? -1 : 0),
    }));

    emitChange({ kind: "remove", id });
}
