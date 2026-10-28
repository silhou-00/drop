// The page scrollbar, option A "Hairline". A thin ink thumb sized to the page sits at the right
// edge; it widens under the pointer, follows a drag, jumps on a track click and fades out when
// the page is still. It only exists for a mouse or trackpad: on touch screens nothing renders
// and the device keeps its own bar. While it is shown the native page bar is hidden. It reads
// the scroll position from the caller's frame loop when given one (the landing passes its
// own, so Lenis and the bar move together), otherwise from one passive scroll listener batched
// into an animation frame. It is decoration for pointer users, so it is hidden from screen
// readers and is never a tab stop; the keyboard scrolls the page as usual.
import { useEffect, useRef, useSyncExternalStore, type CSSProperties, type PointerEvent } from "react";
import type Lenis from "lenis";
import { scrollAreaCssVars, scrollbarCssVars, scrollbarDefaults, scrollbarSchema } from "@/lib/scrollbar/tokens";
import { useTweaks } from "@/lib/tweaks/use-tweaks";

export type HairlineFrame = { y: number; darkAt: (viewportY: number) => boolean };
export type HairlineSource = (listener: (frame: HairlineFrame) => void) => () => void;

type ScrollHairlineProps = { lenis: Lenis | null; source?: HairlineSource };

const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const TRACK_INSET = 6;

function subscribeFine(onChange: () => void) {
    const query = window.matchMedia(FINE_POINTER);

    query.addEventListener("change", onChange);

    return () => {
        query.removeEventListener("change", onChange);
    };
}

function readFine() {
    return window.matchMedia(FINE_POINTER).matches;
}

function readFineOnServer() {
    return false;
}

// fallback source: one passive scroll listener, batched into an animation frame
function windowSource(listener: (frame: HairlineFrame) => void) {
    let frame = 0;

    const notify = () => {
        frame = 0;
        listener({ y: window.scrollY, darkAt: () => false });
    };
    const onScroll = () => {
        if (!frame) {
            frame = window.requestAnimationFrame(notify);
        }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    notify();

    return () => {
        window.removeEventListener("scroll", onScroll);
        window.cancelAnimationFrame(frame);
    };
}

export function ScrollHairline({ lenis, source }: ScrollHairlineProps) {
    const fine = useSyncExternalStore(subscribeFine, readFine, readFineOnServer);
    const tokens = useTweaks("Scrollbar", scrollbarDefaults, scrollbarSchema);
    const barRef = useRef<HTMLDivElement>(null);
    const thumbRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef({ y: 0, max: 1, vh: 1, thumbH: 60, travel: 1, dark: false, hover: false, drag: false });
    const darkAtRef = useRef<(viewportY: number) => boolean>(() => false);
    const hideTimerRef = useRef(0);
    const hideDelayRef = useRef(tokens.shared.hideDelay);
    const wakeRef = useRef(() => {});

    useEffect(() => {
        hideDelayRef.current = tokens.shared.hideDelay;
    }, [tokens]);

    // inner scroll areas share the area inks
    useEffect(() => {
        const root = document.documentElement;

        Object.entries(scrollAreaCssVars(tokens)).forEach(([name, value]) => root.style.setProperty(name, value));
    }, [tokens]);

    useEffect(() => {
        if (!fine) {
            return;
        }

        const root = document.documentElement;

        root.classList.add("sb-on");

        return () => {
            root.classList.remove("sb-on", "sb-drag");
        };
    }, [fine]);

    useEffect(() => {
        const bar = barRef.current;
        const thumb = thumbRef.current;
        const state = stateRef.current;

        if (!fine || !bar || !thumb) {
            return;
        }

        let wokeAt = 0;

        // hide once the delay has passed since the last wake, unless the pointer is on it;
        // re-armed for the time left, so steady scrolling sets no new timer per frame
        function checkHide() {
            const left = wokeAt + hideDelayRef.current - performance.now();

            hideTimerRef.current = 0;

            if (left > 0) {
                hideTimerRef.current = window.setTimeout(checkHide, left);

                return;
            }

            if (bar && !state.hover && !state.drag) {
                bar.classList.remove("show");
            }
        }

        // show, then start the hide timer if none is running
        function wake() {
            if (!bar) {
                return;
            }

            bar.classList.add("show");
            wokeAt = performance.now();

            if (hideTimerRef.current === 0) {
                hideTimerRef.current = window.setTimeout(checkHide, hideDelayRef.current);
            }
        }

        wakeRef.current = wake;

        function layout() {
            if (!thumb) {
                return;
            }

            const docH = document.documentElement.scrollHeight;
            const trackH = window.innerHeight - 2 * TRACK_INSET;

            state.vh = window.innerHeight;
            state.max = Math.max(1, docH - state.vh);
            state.thumbH = Math.max(tokens.hairline.minThumb, Math.round(trackH * (state.vh / docH)));
            state.travel = Math.max(1, trackH - state.thumbH);
            thumb.style.height = `${state.thumbH}px`;
        }

        function render() {
            if (!bar || !thumb) {
                return;
            }

            const progress = Math.min(1, Math.max(0, state.y / state.max));
            const y = TRACK_INSET + state.travel * progress;
            const dark = darkAtRef.current(y + state.thumbH / 2);

            thumb.style.transform = `translate3d(0,${y.toFixed(2)}px,0)`;

            if (dark !== state.dark) {
                state.dark = dark;
                bar.classList.toggle("dk", dark);
            }
        }

        const onFrame = ({ y, darkAt }: HairlineFrame) => {
            const moved = Math.abs(y - state.y) >= 0.1;

            darkAtRef.current = darkAt;
            state.y = y;
            render();

            if (moved) {
                wake();
            }
        };
        const onResize = () => {
            layout();
            render();
        };
        const observer = new ResizeObserver(onResize);

        layout();
        observer.observe(document.body);
        window.addEventListener("resize", onResize);

        const stop = (source ?? windowSource)(onFrame);

        return () => {
            stop();
            observer.disconnect();
            window.removeEventListener("resize", onResize);
            window.clearTimeout(hideTimerRef.current);
            hideTimerRef.current = 0;
        };
    }, [fine, source, tokens]);

    if (!fine) {
        return null;
    }

    function scrollTo(y: number, immediate: boolean) {
        const top = Math.min(stateRef.current.max, Math.max(0, y));

        if (lenis) {
            lenis.scrollTo(top, { immediate });
        } else {
            window.scrollTo({ top, behavior: "auto" });
        }
    }

    function setFlag(name: "hover" | "drag", on: boolean) {
        stateRef.current[name] = on;
        barRef.current?.classList.toggle(name, on);
    }

    // track click: the thumb centre lands under the pointer
    function handleTrackDown(event: PointerEvent<HTMLDivElement>) {
        const state = stateRef.current;

        if (event.button !== 0 || (event.target as HTMLElement).closest(".thumb")) {
            return;
        }

        event.preventDefault();
        scrollTo(((event.clientY - TRACK_INSET - state.thumbH / 2) / state.travel) * state.max, false);
    }

    // drag: pointer travel maps to scroll travel
    function handleThumbDown(event: PointerEvent<HTMLDivElement>) {
        const thumb = event.currentTarget;
        const state = stateRef.current;
        const root = document.documentElement;
        const startY = event.clientY;
        const startScroll = state.y;
        const ratio = state.max / state.travel;

        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        thumb.setPointerCapture(event.pointerId);
        setFlag("drag", true);
        root.classList.add("sb-drag");

        const move = (ev: globalThis.PointerEvent) => {
            scrollTo(startScroll + (ev.clientY - startY) * ratio, true);
        };
        const up = () => {
            thumb.removeEventListener("pointermove", move);
            thumb.removeEventListener("pointerup", up);
            thumb.removeEventListener("pointercancel", up);
            setFlag("drag", false);
            root.classList.remove("sb-drag");
            wakeRef.current();
        };

        thumb.addEventListener("pointermove", move);
        thumb.addEventListener("pointerup", up);
        thumb.addEventListener("pointercancel", up);
    }

    return (
        <div
            className="sb sb-a"
            aria-hidden="true"
            style={scrollbarCssVars(tokens) as CSSProperties}
            ref={barRef}
            onPointerDown={handleTrackDown}
            onPointerEnter={() => {
                setFlag("hover", true);
                wakeRef.current();
            }}
            onPointerLeave={() => {
                setFlag("hover", false);
                wakeRef.current();
            }}
        >
            <div className="track">
                <span className="ink l" />
                <span className="ink d" />
            </div>
            <div className="thumb" ref={thumbRef} onPointerDown={handleThumbDown}>
                <div className="inner">
                    <span className="ink l" />
                    <span className="ink d" />
                </div>
            </div>
        </div>
    );
}
