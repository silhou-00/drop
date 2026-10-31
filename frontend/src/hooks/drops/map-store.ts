// The drops kept for the map in this tab. They live in memory only and are never written to
// storage, so a quick return to the map reuses them without a new request. Readers subscribe
// and get a fresh snapshot on every change. A drop marked read or deleted anywhere in the app
// is updated or removed here too, through the inbox store's change listener.
import { onDropChange } from "@/hooks/drops/inbox-store";
import type { InboxItem } from "@/lib/drops/model";

export type MapSnapshot = {
    status: "idle" | "loading" | "ready" | "error";
    items: InboxItem[];
    nextCursor: string | null;
    loadedAt: number;
    error: string;
    loadingMore: boolean;
    moreError: string;
};

const listeners = new Set<() => void>();

let snapshot: MapSnapshot = {
    status: "idle",
    items: [],
    nextCursor: null,
    loadedAt: 0,
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

export function updateMap(change: (current: MapSnapshot) => MapSnapshot) {
    snapshot = change(snapshot);

    for (const listener of listeners) {
        listener();
    }
}

// a read change replaces the kept copy, and a delete takes it out
onDropChange((change) => {
    if (change.kind === "read") {
        updateMap((current) => ({
            ...current,
            items: current.items.map((kept) => (kept.id === change.item.id ? change.item : kept)),
        }));

        return;
    }

    updateMap((current) => ({ ...current, items: current.items.filter((kept) => kept.id !== change.id) }));
});
