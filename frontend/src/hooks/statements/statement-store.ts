// The signed-in owner's running statement for this tab, shared by My link, the inbox banner and
// the link card. It lives in memory only and is never written to storage. Readers subscribe and
// get a fresh snapshot on every change. The deadline is worked out once, when the server's
// answer arrives, from the seconds left it sent, so every screen counts down to the same moment.
// A statement that runs out here is only marked ended locally; the server already knows.
import type { Statement } from "@/lib/statements/model";

export type StatementSnapshot = {
    status: "idle" | "loading" | "ready" | "error";
    statement: Statement | null;
    deadline: number | null;
    error: string;
};

const listeners = new Set<() => void>();

let snapshot: StatementSnapshot = { status: "idle", statement: null, deadline: null, error: "" };

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

export function update(change: (current: StatementSnapshot) => StatementSnapshot) {
    snapshot = change(snapshot);

    for (const listener of listeners) {
        listener();
    }
}

// the server's running statement, or null when the link is closed
export function setCurrent(statement: Statement | null) {
    const running = statement?.running ? statement : null;

    update(() => ({
        status: "ready",
        statement: running,
        deadline: running ? Date.now() + running.seconds_left * 1000 : null,
        error: "",
    }));
}

// seconds from now to the stored deadline, for a countdown starting on this screen
export function secondsUntil(deadline: number | null) {
    return deadline === null ? null : (deadline - Date.now()) / 1000;
}

// the countdown reached zero, so the link is closed
export function markEnded() {
    update((current) => ({ ...current, statement: null, deadline: null }));
}
