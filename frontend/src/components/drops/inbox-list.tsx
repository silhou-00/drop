// The inbox list for one filter. On top: the logo (phones only, where the nav has none), the
// "Inbox" heading with the "N new" count from the server, and the filter chips, which put the
// filter in the address. Below: today's drops, then an "Earlier" group, newest first, with
// "Load more" while the server has another page. It has loading, failed (with retry) and
// empty states; the empty state differs per filter, and for all drops it offers to share the
// owner's link. The heading takes focus after a delete so keyboard users land somewhere sane.
import { useNavigate } from "@tanstack/react-router";
import { LinkSimple } from "@phosphor-icons/react";
import { InboxCard } from "@/components/drops/inbox-card";
import { FilterChips } from "@/components/drops/filter-chips";
import { useInbox } from "@/hooks/drops/use-inbox";
import { useLinkShare } from "@/hooks/profiles/use-link-share";
import { useOwnLink } from "@/hooks/profiles/use-own-link";
import { groupByDay } from "@/lib/drops/helper";
import type { InboxFilter, InboxItem } from "@/lib/drops/model";

const EMPTY_COPY: Record<InboxFilter, { title: string; body: string }> = {
    all: { title: "No drops yet", body: "Put your link in your story. Notes from real places land here." },
    unread: { title: "No unread drops", body: "You have read every drop." },
    photos: { title: "No photos yet", body: "Drops sent with a photo show up here." },
};

type InboxListProps = { filter: InboxFilter };

// one day group: a heading (hidden for today) and its cards
function CardGroup({ title, hidden, items }: { title: string; hidden: boolean; items: InboxItem[] }) {
    return (
        // day group
        <div className="sub-section inbox-group">
            <div className="placement">
                <div className="container">
                    <h2 className={hidden ? "inbox-sr" : "inbox-group-title"}>{title}</h2>
                </div>
            </div>
            <ul className="placement inbox-cards">
                {items.map((item) => (
                    <li key={item.id} className="container">
                        <InboxCard item={item} />
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function InboxList({ filter }: InboxListProps) {
    const navigate = useNavigate();
    const inbox = useInbox(filter);
    const own = useOwnLink();
    const share = useLinkShare(own.link);
    const groups = groupByDay(inbox.items);
    const empty = EMPTY_COPY[filter];
    const loading = inbox.status === "loading";

    // the filter goes in the address; "all" is the plain address
    function handleFilter(next: InboxFilter) {
        void navigate({
            to: ".",
            search: (prev) => ({ ...prev, filter: next === "all" ? undefined : next }),
            replace: true,
        });
    }

    return (
        <section className="section inbox-list" aria-labelledby="inbox-title">
            {/* heading and filters */}
            <div className="sub-section inbox-head">
                <div className="placement inbox-mobile-logo">
                    <div className="container">
                        <img className="app-logo app-logo-light" src="/brand/logo.svg" alt="Drop" />
                        <img className="app-logo app-logo-dark" src="/brand/logo-dark.svg" alt="Drop" />
                    </div>
                </div>
                <div className="placement inbox-title-row">
                    <div className="container">
                        <h1 id="inbox-title" className="inbox-title" tabIndex={-1}>
                            Inbox
                        </h1>
                    </div>
                    {inbox.unreadCount === null ? null : (
                        <div className="container">
                            <p className="inbox-new">{inbox.unreadCount} new</p>
                        </div>
                    )}
                </div>
                <FilterChips value={filter} onChange={handleFilter} />
            </div>

            {inbox.status === "error" && inbox.items.length === 0 ? (
                // load failed
                <div className="sub-section">
                    <div className="placement auth-stack">
                        <div className="container">
                            <p className="auth-error" role="alert">
                                {inbox.error}
                            </p>
                        </div>
                        <div className="container">
                            <button className="auth-btn auth-btn-paper" type="button" onClick={inbox.retry}>
                                Try again
                            </button>
                        </div>
                    </div>
                </div>
            ) : loading && inbox.items.length === 0 ? (
                // first load
                <div className="sub-section" aria-busy="true">
                    <div className="placement">
                        <div className="container">
                            <p className="auth-status" role="status">
                                Loading your drops
                            </p>
                        </div>
                    </div>
                </div>
            ) : inbox.items.length === 0 ? (
                // empty for this filter
                <div className="sub-section inbox-empty">
                    <div className="placement inbox-empty-card">
                        <div className="container">
                            <h2 className="inbox-empty-title">{empty.title}</h2>
                        </div>
                        <div className="container">
                            <p className="inbox-empty-copy">{empty.body}</p>
                        </div>
                        {filter === "all" && own.link ? (
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-ink inbox-btn-large"
                                    type="button"
                                    disabled={share.busy}
                                    onClick={() => {
                                        void share.share();
                                    }}
                                >
                                    <LinkSimple className="inbox-cta-icon" weight="bold" aria-hidden="true" />
                                    Share my link
                                </button>
                            </div>
                        ) : null}
                        {filter === "all" ? null : (
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-paper"
                                    type="button"
                                    onClick={() => {
                                        handleFilter("all");
                                    }}
                                >
                                    Show all drops
                                </button>
                            </div>
                        )}
                        <div className="container">
                            <p className="auth-status" role="status">
                                {share.message}
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                // drop list
                <div className="sub-section inbox-groups" aria-busy={loading}>
                    {groups.today.length > 0 ? <CardGroup title="Today" hidden items={groups.today} /> : null}
                    {groups.earlier.length > 0 ? (
                        <CardGroup title="Earlier" hidden={false} items={groups.earlier} />
                    ) : null}
                </div>
            )}

            {inbox.items.length > 0 && (inbox.nextCursor || inbox.moreError || inbox.error) ? (
                // more and late errors
                <div className="sub-section">
                    <div className="placement auth-stack">
                        <div className="container">
                            <p className="auth-error" role="alert">
                                {inbox.moreError || inbox.error}
                            </p>
                        </div>
                        {inbox.status === "error" ? (
                            <div className="container">
                                <button className="auth-btn auth-btn-paper" type="button" onClick={inbox.retry}>
                                    Try again
                                </button>
                            </div>
                        ) : null}
                        {inbox.nextCursor ? (
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-paper"
                                    type="button"
                                    disabled={inbox.loadingMore}
                                    onClick={() => {
                                        void inbox.loadMore();
                                    }}
                                >
                                    {inbox.loadingMore ? <span className="auth-spin" aria-hidden="true" /> : null}
                                    {inbox.loadingMore ? "Loading" : "Load more"}
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </section>
    );
}
