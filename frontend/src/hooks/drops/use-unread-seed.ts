// Fills in the Inbox tab's unread count when the app is opened on a page that does not load
// drops itself (My link or Settings). It runs once when the signed-in shell mounts, asks the
// server for the smallest possible inbox page, and keeps only its unread count. The inbox and
// the map bring the count with their own pages, so they make no extra request. A failure is
// silent and never retried; the badge simply stays empty until a page that loads drops.
import { useEffect } from "react";
import { getSnapshot, setUnreadCount } from "@/hooks/drops/inbox-store";
import { listDrops } from "@/lib/drops/api";

export function useUnreadSeed() {
    useEffect(() => {
        const { pathname } = window.location;

        if (getSnapshot().unreadCount !== null || pathname.startsWith("/inbox") || pathname.startsWith("/map")) {
            return;
        }

        const controller = new AbortController();

        listDrops({ limit: 1 }, controller.signal).then(
            (page) => {
                if (controller.signal.aborted || getSnapshot().unreadCount !== null) {
                    return;
                }

                setUnreadCount(page.unread_count);
            },
            () => {
                // silent: the badge waits for a page that loads drops
            },
        );

        return () => {
            controller.abort();
        };
    }, []);
}
