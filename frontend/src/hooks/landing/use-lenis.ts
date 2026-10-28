// Smooth wheel scrolling for the landing. Creates one Lenis instance while the landing is
// mounted, with no loop of its own: the landing's single frame loop drives it. Touch keeps the
// device's own scrolling, and under reduced motion no instance is made at all, so the page
// scrolls natively. The instance lives in a small external store: React subscribes after
// commit, which creates it, and unsubscribes on unmount or when disabled, which destroys it.
import { useCallback, useRef, useSyncExternalStore } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

function readNothing() {
    return null;
}

export function useLenis(enabled: boolean): Lenis | null {
    const instanceRef = useRef<Lenis | null>(null);

    // subscribing creates the instance, unsubscribing destroys it
    const subscribe = useCallback(
        (onChange: () => void) => {
            if (!enabled) {
                return () => {};
            }

            const instance = new Lenis({ autoRaf: false, syncTouch: false });

            instanceRef.current = instance;
            onChange();

            return () => {
                instance.destroy();

                if (instanceRef.current === instance) {
                    instanceRef.current = null;
                }

                onChange();
            };
        },
        [enabled],
    );

    const read = useCallback(() => instanceRef.current, []);

    return useSyncExternalStore(subscribe, read, readNothing);
}
