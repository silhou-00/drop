// Reveal on entry for the landing's lower sections. The element is marked "reveal" only when the
// browser has an IntersectionObserver, and gets "in" the first time it enters the view, after
// which the observer stops. The fade itself is CSS only, and only under no-preference for
// motion, so without the observer or under reduced motion the content simply shows.
import { useEffect, useRef } from "react";

const ROOT_MARGIN = "0px 0px -10% 0px";

export function useReveal<T extends HTMLElement>() {
    const ref = useRef<T>(null);

    useEffect(() => {
        const element = ref.current;

        if (!element || typeof IntersectionObserver === "undefined") {
            return;
        }

        element.classList.add("reveal");

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    element.classList.add("in");
                    observer.disconnect();
                }
            },
            { rootMargin: ROOT_MARGIN },
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, []);

    return ref;
}
