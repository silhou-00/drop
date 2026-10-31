// A live countdown to a deadline, for a running statement. The deadline is set once per key,
// from the seconds left the server sent, so a wrong clock on the phone does not matter. It ticks
// once a second, catches up at once when the tab comes back into view, and stops at zero. It
// never asks the server for anything; the server still decides whether a statement is running.
import { useEffect, useState } from "react";

const TICK_MS = 1000;

type Clock = { key: string; deadline: number; now: number };

// a clock for one key: its deadline from the seconds left, read against the time it starts
function startClock(key: string, secondsLeft: number | null): Clock {
    const now = Date.now();

    return { key, deadline: secondsLeft === null ? 0 : now + Math.max(0, secondsLeft) * 1000, now };
}

export function useCountdown(secondsLeft: number | null, key: string) {
    const [clock, setClock] = useState(() => startClock(key, secondsLeft));

    // a new key starts a new deadline from the seconds it came with
    if (clock.key !== key) {
        setClock(startClock(key, secondsLeft));
    }

    const msLeft = Math.max(0, clock.deadline - clock.now);
    const done = msLeft === 0;

    // tick until zero, and catch up when the tab is shown again
    useEffect(() => {
        if (done) {
            return;
        }

        function tick() {
            setClock((current) => ({ ...current, now: Date.now() }));
        }

        function handleVisibility() {
            if (document.visibilityState === "visible") {
                tick();
            }
        }

        const timer = window.setInterval(tick, TICK_MS);

        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.clearInterval(timer);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [done, clock.key]);

    return { msLeft, done };
}
