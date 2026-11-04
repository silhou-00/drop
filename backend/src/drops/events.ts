// Live drop notifications. Keeps, per profile, the listeners of the open inbox streams
// and tells them when a drop lands. In memory on a single instance: running more than
// one server instance needs a shared channel, which is an open item. Only the drop id
// is published, never its content.
type DropListener = (dropId: string) => void;

type Options = {
    maxPerOwner?: number;
};

export function createDropEvents({ maxPerOwner = 5 }: Options = {}) {
    const listeners = new Map<string, Set<DropListener>>();

    // null when the owner already has the most streams open
    function subscribe(ownerId: string, listener: DropListener): (() => void) | null {
        const set = listeners.get(ownerId) ?? new Set<DropListener>();

        if (set.size >= maxPerOwner) {
            return null;
        }

        set.add(listener);
        listeners.set(ownerId, set);

        return () => {
            const current = listeners.get(ownerId);

            if (!current) {
                return;
            }

            current.delete(listener);

            if (current.size === 0) {
                listeners.delete(ownerId);
            }
        };
    }

    function publish(ownerId: string, dropId: string) {
        for (const listener of [...(listeners.get(ownerId) ?? [])]) {
            listener(dropId);
        }
    }

    return { subscribe, publish };
}

export type DropEvents = ReturnType<typeof createDropEvents>;
