// Dev-only badge in the bottom-left corner naming the active viewport band from the
// frontend layout rules, with the current width. The root route loads it lazily and
// only in dev, so it never reaches the production bundle.
import { useSyncExternalStore } from "react";

const BANDS = [
    { name: "Mobile", min: 0 },
    { name: "Tablet", min: 768 },
    { name: "Laptop/desktop", min: 1280 },
    { name: "Full HD+", min: 1920 },
];

function subscribe(onChange: () => void) {
    window.addEventListener("resize", onChange);

    return () => {
        window.removeEventListener("resize", onChange);
    };
}

function getWidth() {
    return window.innerWidth;
}

function bandFor(width: number) {
    let band = BANDS[0].name;

    for (const candidate of BANDS) {
        if (width >= candidate.min) {
            band = candidate.name;
        }
    }

    return band;
}

export function BreakpointIndicator() {
    const width = useSyncExternalStore(subscribe, getWidth);

    return (
        <div className="pointer-events-none fixed bottom-3 left-3 z-[1001] rounded-md bg-black/80 px-2 py-1 font-mono text-xs text-white">
            {bandFor(width)} {width}px
        </div>
    );
}
