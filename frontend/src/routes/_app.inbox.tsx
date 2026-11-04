// The inbox: the list of drops, and from laptops up the reading pane beside it. The filter
// lives in the address as ?filter=unread or ?filter=photos (no filter means all), checked here
// so any other value falls back to all. One statement's drops show with ?statement= and its id,
// or "earlier" for the drops from before statements; any other value is dropped. On phones and tablets the list and an open drop take
// turns; from laptops up both show, with "Pick a drop" in the pane until one is open. The
// layout keeps the live stream open, so a new drop appears in the list without a reload; the
// map is marked stale so it loads again when next opened.
import { Outlet, createFileRoute, useParams } from "@tanstack/react-router";
import { InboxList } from "@/components/drops/inbox-list";
import { expireMap } from "@/hooks/drops/map-store";
import { useDropStream } from "@/hooks/drops/use-drop-stream";
import { refreshInbox } from "@/hooks/drops/use-inbox";
import { useWide } from "@/hooks/layout/use-wide";
import { isInboxFilter, isStatementFilter, type InboxFilter } from "@/lib/drops/model";
import "@/styles/inbox.css";

export const Route = createFileRoute("/_app/inbox")({
    validateSearch: (
        search: Record<string, unknown>,
    ): { filter?: Exclude<InboxFilter, "all">; statement?: string } => ({
        filter: isInboxFilter(search.filter) && search.filter !== "all" ? search.filter : undefined,
        statement: isStatementFilter(search.statement) ? search.statement : undefined,
    }),
    component: InboxLayout,
});

// refresh the list and mark the map stale
function inboxRefresh(signal: AbortSignal) {
    expireMap();

    return refreshInbox(signal);
}

function InboxLayout() {
    const { filter, statement } = Route.useSearch();
    const { id } = useParams({ strict: false });
    const wide = useWide();

    useDropStream(inboxRefresh);

    return (
        <div className="app-panes" data-open={id ? "true" : undefined}>
            {!id || wide ? (
                <div className="app-pane-list">
                    <InboxList filter={filter ?? "all"} statement={statement} />
                </div>
            ) : null}
            {wide || id ? (
                <div className="app-pane-read">
                    <Outlet />
                </div>
            ) : null}
        </div>
    );
}
