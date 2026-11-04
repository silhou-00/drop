// The story card style the owner last picked, held in memory while the app is open and shared
// by My link and a drop's Share panel. It is never written to storage, so a reload brings back
// the default look. A change is kept only when its value is one of the fixed choices in the
// share model; anything else is ignored.
import { useSyncExternalStore } from "react";
import {
    DEFAULT_STORY_STYLE,
    STORY_ALIGNS,
    STORY_BACKGROUNDS,
    STORY_CARD_COLORS,
    STORY_TEXT_SIZES,
    STORY_TYPEFACES,
    type StoryStyle,
} from "@/lib/share/model";

const CHOICES: Record<keyof StoryStyle, readonly { id: string }[]> = {
    background: STORY_BACKGROUNDS,
    card: STORY_CARD_COLORS,
    font: STORY_TYPEFACES,
    size: STORY_TEXT_SIZES,
    align: STORY_ALIGNS,
};

const listeners = new Set<() => void>();

let current: StoryStyle = DEFAULT_STORY_STYLE;

function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

function snapshot() {
    return current;
}

// keep each known value from the change, then tell the readers once
function setStyle(partial: Partial<StoryStyle>) {
    const next: StoryStyle = { ...current };
    let changed = false;

    for (const key of Object.keys(CHOICES) as (keyof StoryStyle)[]) {
        const value = partial[key];

        if (value === undefined || value === current[key]) {
            continue;
        }

        if (CHOICES[key].some((entry) => entry.id === value)) {
            Object.assign(next, { [key]: value });
            changed = true;
        }
    }

    if (!changed) {
        return;
    }

    current = next;
    listeners.forEach((listener) => {
        listener();
    });
}

export function useStoryStyle() {
    const style = useSyncExternalStore(subscribe, snapshot);

    return { style, setStyle };
}
