// The theme choice for every screen that shows or changes it. The choice is kept in memory for
// this tab, starting from storage, so it still works when storage is blocked. Readers hear a
// change made here, a device switch between light and dark (which moves auto), and a change
// made in another tab, which is applied here too. Choosing hands the work to the theme module.
import { useSyncExternalStore } from "react";
import { effectiveTheme, switchTheme } from "@/lib/theme/apply";
import { THEME_STORAGE_KEY, type Theme, type ThemePreference } from "@/lib/theme/model";
import { applyPreference, readPreference } from "@/lib/theme/preference";

type ThemeSnapshot = { preference: ThemePreference; effective: Theme };

const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

let snapshot: ThemeSnapshot | null = null;
let deviceQuery: MediaQueryList | null = null;

function build(preference: ThemePreference): ThemeSnapshot {
    return { preference, effective: effectiveTheme(preference) };
}

function getSnapshot() {
    if (!snapshot) {
        snapshot = build(readPreference());
    }

    return snapshot;
}

function emit(preference: ThemePreference) {
    snapshot = build(preference);

    for (const listener of listeners) {
        listener();
    }
}

// device changes move auto
function handleDevice() {
    emit(getSnapshot().preference);
}

// another tab wrote the key: take its choice and show it here
function handleStorage(event: StorageEvent) {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) {
        return;
    }

    const preference = readPreference();

    applyPreference(preference);
    emit(preference);
}

function subscribe(listener: () => void) {
    if (!deviceQuery) {
        deviceQuery = window.matchMedia(DARK_QUERY);
    }

    const query = deviceQuery;

    if (listeners.size === 0) {
        query.addEventListener("change", handleDevice);
        window.addEventListener("storage", handleStorage);
    }

    listeners.add(listener);

    return () => {
        listeners.delete(listener);

        if (listeners.size === 0) {
            query.removeEventListener("change", handleDevice);
            window.removeEventListener("storage", handleStorage);
        }
    };
}

export function useTheme() {
    const { preference, effective } = useSyncExternalStore(subscribe, getSnapshot);

    // a new choice, grown from the given point when there is one
    function choose(next: ThemePreference, origin?: { x: number; y: number }) {
        if (next === getSnapshot().preference) {
            return;
        }

        switchTheme(next, origin);
        emit(next);
    }

    return { preference, effective, choose };
}
