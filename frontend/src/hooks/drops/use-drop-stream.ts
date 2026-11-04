// Keeps one live stream open to the server while a page that shows drops is mounted, and runs
// the page's refresh when a drop arrives. The stream carries only a drop id, which is checked
// and then ignored: the refresh reads the real list through the normal calls, so nothing from
// the stream is ever shown. Refreshes run one at a time and at most one every two seconds, with
// one trailing run. After a reconnect, or when the tab returns to view, one refresh catches up
// on what was missed. A stream the browser gave up on is reopened after a wait that doubles to
// five minutes. A hidden tab closes the stream, and unmounting closes it and cancels the rest.
import { useEffect, useRef } from "react";
import { openDropStream } from "@/lib/drops/api";
import { DROP_STREAM_EVENT, isDropId } from "@/lib/drops/model";

const MIN_GAP_MS = 2000;
const RECONNECT_MIN_MS = 30_000;
const RECONNECT_MAX_MS = 300_000;

export function useDropStream(refresh: (signal: AbortSignal) => Promise<void>) {
    const refreshRef = useRef(refresh);

    // the latest refresh without reopening the stream
    useEffect(() => {
        refreshRef.current = refresh;
    }, [refresh]);

    useEffect(() => {
        let source: EventSource | null = null;
        let controller: AbortController | null = null;
        let reopenTimer: number | undefined;
        let gapTimer: number | undefined;
        let opened = false;
        let inFlight = false;
        let pending = false;
        let lastRun = 0;
        let backoff = RECONNECT_MIN_MS;

        // one refresh now; a newer run cancels an older one
        function run() {
            const mine = new AbortController();

            controller?.abort();
            controller = mine;
            inFlight = true;
            pending = false;
            lastRun = Date.now();

            refreshRef.current(mine.signal).finally(() => {
                if (controller !== mine) {
                    return;
                }

                inFlight = false;

                if (pending) {
                    schedule();
                }
            });
        }

        // at most one in flight, at most one per gap, with a trailing run
        function schedule() {
            if (inFlight) {
                pending = true;

                return;
            }

            const wait = lastRun + MIN_GAP_MS - Date.now();

            if (wait > 0) {
                pending = true;
                window.clearTimeout(gapTimer);
                gapTimer = window.setTimeout(() => {
                    gapTimer = undefined;
                    schedule();
                }, wait);

                return;
            }

            run();
        }

        function close() {
            source?.close();
            source = null;
        }

        function stopTimers() {
            window.clearTimeout(reopenTimer);
            window.clearTimeout(gapTimer);
            reopenTimer = undefined;
            gapTimer = undefined;
            pending = false;
        }

        function open() {
            if (source) {
                return;
            }

            const stream = openDropStream();

            source = stream;

            stream.addEventListener("open", () => {
                backoff = RECONNECT_MIN_MS;

                if (opened) {
                    schedule();
                }

                opened = true;
            });

            stream.addEventListener(DROP_STREAM_EVENT, (event) => {
                if (isDropId((event as MessageEvent<string>).data)) {
                    schedule();
                }
            });

            stream.addEventListener("error", () => {
                if (stream.readyState !== EventSource.CLOSED) {
                    return;
                }

                close();
                reopenTimer = window.setTimeout(open, backoff);
                backoff = Math.min(backoff * 2, RECONNECT_MAX_MS);
            });
        }

        function handleVisibility() {
            if (document.visibilityState === "hidden") {
                close();
                stopTimers();

                return;
            }

            open();
        }

        open();
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            close();
            stopTimers();
            controller?.abort();
            controller = null;
        };
    }, []);
}
