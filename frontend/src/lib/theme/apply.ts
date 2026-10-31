// Showing a new theme choice. A change is written first, then shown: at once when nothing
// visible changes, when the browser has no view transitions, when reduced motion is on, or when
// there is no point to grow from; otherwise the new theme grows out of that point as a circle
// (the iris), drawn by the browser over a snapshot of the old one. Reading and storing the choice lives in the preference
// module, which pages can load without the motion settings used here.
import { motionDefaults } from "@/lib/motion/tokens";
import { cssEasing } from "@/lib/motion/easings";
import { isStoredTheme, type Theme, type ThemePreference } from "./model";
import { applyPreference, writePreference } from "./preference";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

// the theme actually shown for a choice; auto follows the device
export function effectiveTheme(preference: ThemePreference): Theme {
    if (preference !== "auto") {
        return preference;
    }

    return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

// the choice shown now, from the root attribute
function shownPreference(): ThemePreference {
    const shown = document.documentElement.getAttribute("data-theme");

    return isStoredTheme(shown) ? shown : "auto";
}

export function switchTheme(preference: ThemePreference, origin?: { x: number; y: number }) {
    const current = shownPreference();

    if (preference === current) {
        return;
    }

    writePreference(preference);

    const unchanged = effectiveTheme(preference) === effectiveTheme(current);
    const reduced = window.matchMedia(REDUCED_QUERY).matches;

    if (unchanged || !document.startViewTransition || reduced || !origin) {
        applyPreference(preference);

        return;
    }

    const { x, y } = origin;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = document.startViewTransition(() => {
        applyPreference(preference);
    });

    transition.ready.then(
        () => {
            document.documentElement.animate(
                { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
                {
                    duration: motionDefaults.iris.duration,
                    easing: cssEasing(motionDefaults.iris.easing),
                    pseudoElement: "::view-transition-new(root)",
                },
            );
        },
        () => {
            // the transition was skipped; the theme is already applied
        },
    );
}
