// Whether the screen is wide enough for the two-pane inbox (list beside the open drop). It
// follows the media query live, so turning a tablet or resizing a window switches the layout
// without a reload.
import { useSyncExternalStore } from "react";

// must match the 80rem laptop band in styles/tokens.css and styles/app-shell.css
const WIDE_QUERY = "(min-width: 80rem)";

function subscribe(listener: () => void) {
    const query = window.matchMedia(WIDE_QUERY);

    query.addEventListener("change", listener);

    return () => {
        query.removeEventListener("change", listener);
    };
}

function getWide() {
    return window.matchMedia(WIDE_QUERY).matches;
}

export function useWide() {
    return useSyncExternalStore(subscribe, getWide);
}
