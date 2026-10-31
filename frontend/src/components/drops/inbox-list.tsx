// The inbox list for one filter and, when the address names one, one statement. On top: the
// logo (phones only, where the nav has none), the "Inbox" heading with the "N new" count from
// the server melted through the goo filter into the pill that says whether the link is taking
// drops, then the filter chips, which put the filter in the address. A scoped list adds a row
// to go back to every statement.
// Below: one section per statement, newest first, then the drops from before statements, with
// "Load more" while the server has another page. It has loading, failed (with retry) and empty
// states; the empty state differs per filter, and for all drops it points to My link. The
// heading takes focus after a delete so keyboard users land somewhere sane.
import { Link, useNavigate } from "@tanstack/react-router";
import { LinkSimple } from "@phosphor-icons/react";
import { InboxCard } from "@/components/drops/inbox-card";
import { FilterChips } from "@/components/drops/filter-chips";
import { Goo, GooFilter } from "@/components/goo/goo-filter";
import { StatementBanner } from "@/components/statements/statement-banner";
import { StatementHeader } from "@/components/statements/statement-header";
import { useInbox } from "@/hooks/drops/use-inbox";
import { groupByStatement } from "@/lib/drops/helper";
import type { InboxFilter, InboxItem } from "@/lib/drops/model";
import type { Statement } from "@/lib/statements/model";

const STATUS_GOO_ID = "inbox-status-goo";
const EMPTY_COPY: Record<InboxFilter, { title: string; body: string }> = {
    all: { title: "No drops yet", body: "Put your link in your story. Notes from real places land here." },
    unread: { title: "No unread drops", body: "You have read every drop." },
    photos: { title: "No photos yet", body: "Drops sent with a photo show up here." },
};

type InboxListProps = { filter: InboxFilter; statement?: string };

type CardGroupProps = { statement: Statement | null; earlierCount: number; scoped: boolean; items: InboxItem[] };

// one statement section: its header and its cards
function CardGroup({ statement, earlierCount, scoped, items }: CardGroupProps) {
    return (
        // statement section
        <div className="sub-section inbox-group">
            <StatementHeader statement={statement} earlierCount={earlierCount} scoped={scoped} />
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

export function InboxList({ filter, statement }: InboxListProps) {
    const navigate = useNavigate();
    const inbox = useInbox(filter, statement);
    const groups = groupByStatement(inbox.items);
    const scoped = statement !== undefined;
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

    // every statement again, keeping the filter
    function handleShowAll() {
        void navigate({ to: ".", search: (prev) => ({ ...prev, statement: undefined }), replace: true });
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
                    {/* count and link status, melted into one shape */}
                    <div className="placement inbox-status">
                        {/* goo layer: the two pill shapes and the bridge under the text */}
                        <div className="container inbox-status-layer" aria-hidden="true">
                            <GooFilter id={STATUS_GOO_ID} />
                            <Goo id={STATUS_GOO_ID} className="inbox-status-goo">
                                <span className="inbox-status-blob" data-part="count" />
                                <span className="inbox-status-blob" data-part="bridge" />
                                <span className="inbox-status-blob" data-part="status" />
                            </Goo>
                        </div>
                        {inbox.unreadCount === null ? null : (
                            <div className="container inbox-new-box">
                                <p className="inbox-new">{inbox.unreadCount} new</p>
                            </div>
                        )}
                        <StatementBanner />
                    </div>
                </div>
                <FilterChips value={filter} onChange={handleFilter} />
                {scoped ? (
                    <div className="placement inbox-scope">
                        <div className="container">
                            <p className="inbox-scope-text">Showing one statement</p>
                        </div>
                        <div className="container">
                            <button className="statement-scope-btn" type="button" onClick={handleShowAll}>
                                Show all
                            </button>
                        </div>
                    </div>
                ) : null}
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
                        {filter === "all" && !scoped ? (
                            <div className="container">
                                <Link className="auth-btn auth-btn-ink inbox-btn-large" to="/my-link">
                                    <LinkSimple className="inbox-cta-icon" weight="bold" aria-hidden="true" />
                                    Go to My link
                                </Link>
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
                        {scoped ? (
                            <div className="container">
                                <button className="auth-btn auth-btn-paper" type="button" onClick={handleShowAll}>
                                    Show all statements
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : (
                // drop list
                <div className="sub-section inbox-groups" aria-busy={loading}>
                    {groups.map((group) => (
                        <CardGroup
                            key={group.id ?? "earlier"}
                            statement={group.id === null ? null : inbox.sections[group.id]}
                            earlierCount={inbox.earlierCount}
                            scoped={scoped}
                            items={group.items}
                        />
                    ))}
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
