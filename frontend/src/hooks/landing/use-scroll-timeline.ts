// The landing's one frame loop. Each animation frame it advances Lenis (when there is one),
// reads the scroll position, turns it into the timeline state and hands that to every
// subscribed component, which writes its own transforms, opacities and classes. The marble
// bath also draws the shader from here, so the page never runs a second loop. The plate beats'
// copy slides off through exit groups while its frame leaves. The page is read
// only when it is laid out again: when the window changes size for real (in-app browser
// toolbars that only nudge the height are ignored), when the fonts arrive and when the tokens
// change. That read finds the sections and the copy blocks the marble stays calm under. The
// loop stops while the tab is hidden. Copy and replies rise when they scroll into view, through
// one IntersectionObserver.
import { createContext, useContext, useEffect, useRef, useState, type RefObject } from "react";
import type Lenis from "lenis";
import type { LandingTokens } from "@/lib/landing/tokens";
import { clamp } from "@/lib/landing/scenes";
import {
    buildLayout,
    exitOffset,
    exitSpans,
    readScroll,
    SECTION_IDS,
    type CalmEntry,
    type LandingLayout,
    type LandingMeasure,
    type ScrollState,
} from "@/lib/landing/timeline";

export type TimelineFrame = { L: LandingLayout; S: ScrollState; now: number; changed: boolean; relaid: boolean };
export type FrameListener = (frame: TimelineFrame) => void;
export type LandingRuntime = { impactAt: number | null };

export type LandingContextValue = {
    subscribe: (listener: FrameListener) => () => void;
    invalidate: () => void;
    lenis: Lenis | null;
    reduced: boolean;
    tokens: LandingTokens;
    runtime: LandingRuntime;
    openClaim: (opener: HTMLElement, name?: string) => void;
    scrollToTarget: (hash: string) => void;
};

type TimelineOptions = {
    rootRef: RefObject<HTMLDivElement | null>;
    lenis: Lenis | null;
    reduced: boolean;
    tokens: LandingTokens;
};

const TOOLBAR_SLACK = 120;

export const LandingContext = createContext<LandingContextValue | null>(null);

export function useLanding() {
    const value = useContext(LandingContext);

    if (!value) {
        throw new Error("useLanding outside the landing");
    }

    return value;
}

// runs a listener on every frame of the landing loop, always with its latest closure
export function useTimelineFrame(listener: FrameListener) {
    const { subscribe } = useLanding();
    const latest = useRef(listener);

    useEffect(() => {
        latest.current = listener;
    });

    useEffect(() => {
        return subscribe((frame) => {
            latest.current(frame);
        });
    }, [subscribe]);
}

// slides one exit group off while its frame leaves; collect returns the group in order
export function useExitGroup(group: number, collect: () => HTMLElement[]) {
    const { tokens, reduced } = useLanding();
    const groupRef = useRef<{ els: HTMLElement[]; last: number }>({ els: [], last: -1 });

    useTimelineFrame(({ L, S, changed, relaid }) => {
        const current = groupRef.current;

        if (reduced || !changed) {
            return;
        }

        if (relaid || !current.els.length) {
            current.els = collect();
            current.last = -1;
        }

        const [a, b] = exitSpans(L, tokens)[group];
        const e0 = clamp((S.y - a) / (b - a));

        if (Math.abs(e0 - current.last) < 0.0005) {
            return;
        }

        current.last = e0;
        current.els.forEach((el, i) => {
            const d = exitOffset(group, i, S.y, L, tokens);

            el.style.transform = d !== 0 ? `translate3d(${d.toFixed(1)}px,0,0)` : "";
        });
    });
}

// sections and calm blocks, read once per layout; nothing pins under reduced motion
function measure(root: HTMLElement, reduced: boolean): LandingMeasure {
    const H = window.innerHeight;
    const sy = window.scrollY;
    const pins = new Map<Element, [number, number]>();

    const sections = SECTION_IDS.map((id) => {
        const section = root.querySelector<HTMLElement>(`#${id}`);

        if (!section) {
            return { top: 0, h: H };
        }

        const top = section.getBoundingClientRect().top + sy;
        const h = section.offsetHeight;

        pins.set(section, reduced ? [0, 0] : [top, top + Math.max(1, h - H)]);

        return { top, h };
    });

    const calm = Array.from(root.querySelectorAll<HTMLElement>("[data-calm]")).map((el): CalmEntry => {
        const r = el.getBoundingClientRect();
        const section = el.closest("[data-pin]");
        const [a, b] = (section && pins.get(section)) || [0, 0];

        return { x: r.left, w: r.width, h: r.height, off: r.top - clamp(sy, a, b) + sy, a, b };
    });

    return {
        width: window.innerWidth,
        height: H,
        sections,
        calm,
    };
}

// motion tokens that the stylesheet reads
function applyCssTokens(root: HTMLElement, tokens: LandingTokens) {
    root.style.setProperty("--rise-dur", `${tokens.rise.dur}ms`);
    root.style.setProperty("--rise-stagger", `${tokens.rise.stagger}ms`);
    root.style.setProperty("--pop-dur", `${tokens.rise.pop}ms`);
    root.style.setProperty("--drop-fall", `${tokens.load.fall}ms`);
}

// headings rise when they enter, and again on the way back
function observeRise(root: HTMLElement, reduced: boolean) {
    const targets = root.querySelectorAll("[data-rise], [data-fade]");

    if (reduced) {
        targets.forEach((el) => el.classList.add("in"));

        return () => {};
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("in");
            } else if (entry.boundingClientRect.top > 0) {
                entry.target.classList.remove("in");
            }
        });
    });

    targets.forEach((el) => observer.observe(el));

    return () => {
        observer.disconnect();
    };
}

export function useScrollTimeline({ rootRef, lenis, reduced, tokens }: TimelineOptions) {
    const listenersRef = useRef(new Set<FrameListener>());
    const dirtyRef = useRef(true);
    const tokensRef = useRef(tokens);
    const relayoutRef = useRef<(() => void) | null>(null);
    const [runtime] = useState<LandingRuntime>(() => ({ impactAt: null }));
    const [api] = useState(() => ({
        subscribe: (listener: FrameListener) => {
            listenersRef.current.add(listener);
            dirtyRef.current = true;

            return () => {
                listenersRef.current.delete(listener);
            };
        },
        invalidate: () => {
            dirtyRef.current = true;
        },
    }));

    // token edits from the dev panel lay the page out again
    useEffect(() => {
        tokensRef.current = tokens;

        if (rootRef.current) {
            applyCssTokens(rootRef.current, tokens);
        }

        relayoutRef.current?.();
    }, [tokens, rootRef]);

    useEffect(() => {
        const root = rootRef.current;

        if (!root) {
            return;
        }

        const listeners = listenersRef.current;
        let layout = buildLayout(measure(root, reduced), tokensRef.current);
        let state: ScrollState | null = null;
        let relaid = true;
        let lastY = -1;
        let frameId = 0;
        let lastW = window.innerWidth;
        let lastH = window.innerHeight;

        function relayout() {
            layout = buildLayout(measure(root as HTMLElement, reduced), tokensRef.current);
            relaid = true;
        }

        function tick(now: number) {
            frameId = 0;
            lenis?.raf(now);

            const y = lenis ? lenis.scroll : window.scrollY;
            const changed = relaid || dirtyRef.current || y !== lastY || !state;

            if (changed) {
                state = readScroll(y, layout, tokensRef.current, reduced);
            }

            const frame = { L: layout, S: state as ScrollState, now, changed, relaid };

            relaid = false;
            dirtyRef.current = false;
            lastY = y;
            listeners.forEach((listener) => listener(frame));

            if (import.meta.env.DEV) {
                Object.assign(window, { __landing: { L: layout, S: state } });
            }

            frameId = requestAnimationFrame(tick);
        }

        function start() {
            if (frameId === 0 && !document.hidden) {
                dirtyRef.current = true;
                frameId = requestAnimationFrame(tick);
            }
        }

        function stop() {
            if (frameId !== 0) {
                cancelAnimationFrame(frameId);
                frameId = 0;
            }
        }

        function handleVisibility() {
            if (document.hidden) {
                stop();
            } else {
                start();
            }
        }

        // in-app browser toolbars change the height while scrolling; only big changes re-lay the page
        function handleResize() {
            if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < TOOLBAR_SLACK) {
                return;
            }

            lastW = window.innerWidth;
            lastH = window.innerHeight;
            relayout();
        }

        const stopRise = observeRise(root, reduced);

        relayoutRef.current = relayout;
        applyCssTokens(root, tokensRef.current);
        window.addEventListener("resize", handleResize);
        document.addEventListener("visibilitychange", handleVisibility);
        document.fonts.ready.then(() => {
            relayoutRef.current?.();
        });
        start();

        return () => {
            stop();
            stopRise();
            relayoutRef.current = null;
            window.removeEventListener("resize", handleResize);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [rootRef, lenis, reduced]);

    return { ...api, runtime };
}
