// The inbox: the list of drops, and from laptops up the reading pane beside it. The filter
// lives in the address as ?filter=unread or ?filter=photos (no filter means all), checked here
// so any other value falls back to all. One statement's drops show with ?statement= and its id,
// or "earlier" for the drops from before statements; any other value is dropped. On phones and tablets the list and an open drop take
// turns; from laptops up both show, with "Pick a drop" in the pane until one is open.
import { Outlet, createFileRoute, useParams } from "@tanstack/react-router";
import { InboxList } from "@/components/drops/inbox-list";
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

function InboxLayout() {
    const { filter, statement } = Route.useSearch();
    const { id } = useParams({ strict: false });
    const wide = useWide();

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
