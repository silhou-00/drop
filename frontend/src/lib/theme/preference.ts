// Reading, storing and setting the theme choice. The stored value is read inside a guard and
// checked against the two allowed values; anything else is removed and treated as auto. While
// the app shell is open, a choice made in another tab is shown in this one too. Nothing here
// loads the motion settings, so the shell can follow other tabs at little cost.
import { THEME_STORAGE_KEY, isStoredTheme, type ThemePreference } from "./model";

export function readPreference(): ThemePreference {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);

        if (stored === null) {
            return "auto";
        }

        if (isStoredTheme(stored)) {
            return stored;
        }

        localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
        return "auto";
    }

    return "auto";
}

export function writePreference(preference: ThemePreference) {
    try {
        if (preference === "auto") {
            localStorage.removeItem(THEME_STORAGE_KEY);
        } else {
            localStorage.setItem(THEME_STORAGE_KEY, preference);
        }
    } catch {
        // storage blocked: the choice still applies to this page
    }
}

export function applyPreference(preference: ThemePreference) {
    if (preference === "auto") {
        document.documentElement.removeAttribute("data-theme");
    } else {
        document.documentElement.setAttribute("data-theme", preference);
    }
}

// another tab wrote the key: show its choice here; returns the stop function
export function followOtherTabs() {
    function handleStorage(event: StorageEvent) {
        if (event.key !== null && event.key !== THEME_STORAGE_KEY) {
            return;
        }

        applyPreference(readPreference());
    }

    window.addEventListener("storage", handleStorage);

    return () => {
        window.removeEventListener("storage", handleStorage);
    };
}
