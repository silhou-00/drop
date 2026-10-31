// The map page: every drop the owner has received, pinned at the place it was sent from. The
// filter (?filter=unread or ?filter=photos), the statement (?statement= and its id, or
// "earlier") and the chosen place (?place=lat,lng) live in the address, each checked here so
// anything else is dropped. The map fills the screen behind glass chips, the statement picker
// and controls. Choosing a place opens its drops in a sheet on phones and tablets and in the
// docked list from laptops, where the list otherwise shows every matching drop and can be
// folded away. MapLibre loads only once drops have arrived; with no drops at all the page
// points to My link instead. The chips and the picker filter what is already loaded.
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CaretLeft, CaretRight, LinkSimple } from "@phosphor-icons/react";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { FilterChips } from "@/components/drops/filter-chips";
import { MapPanel } from "@/components/drops/map-panel";
import { StatementPicker } from "@/components/statements/statement-picker";
import { useMapDrops } from "@/hooks/drops/use-map-drops";
import { useWide } from "@/hooks/layout/use-wide";
import { filterDrops, groupByPlace } from "@/lib/drops/helper";
import {
    MAP_AUTO_PAGES,
    MAP_MAX_DROPS,
    MAP_PAGE_SIZE,
    PLACE_KEY_PATTERN,
    isInboxFilter,
    isStatementFilter,
    type InboxFilter,
} from "@/lib/drops/model";
import "@/styles/inbox.css";
import "@/styles/map.css";

const AllDropsMap = lazy(() =>
    import("@/components/drops/all-drops-map").then((module) => ({ default: module.AllDropsMap })),
);

const EDGE_GAP = 16;
const SIDE_QUERY = "(min-width: 48rem)";

const LIST_TITLES: Record<InboxFilter, string> = {
    all: "All drops",
    unread: "Unread drops",
    photos: "Drops with photos",
};

const NO_MATCH: Record<Exclude<InboxFilter, "all">, string> = {
    unread: "No unread drops",
    photos: "No photos yet",
};

const NO_STATEMENT_MATCH = "No drops from this statement";
const EARLIER_TITLE = "Earlier drops";

type MapSearch = { filter?: Exclude<InboxFilter, "all">; statement?: string; place?: string };

export const Route = createFileRoute("/_app/map")({
    validateSearch: (search: Record<string, unknown>): MapSearch => ({
        filter: isInboxFilter(search.filter) && search.filter !== "all" ? search.filter : undefined,
        statement: isStatementFilter(search.statement) ? search.statement : undefined,
        place: typeof search.place === "string" && PLACE_KEY_PATTERN.test(search.place) ? search.place : undefined,
    }),
    component: MapPage,
});

function rectOf(selector: string) {
    return document.querySelector(selector)?.getBoundingClientRect() ?? null;
}

// how far the chips, the list, the controls and the nav reach into the map from each edge
function measureInsets() {
    const side = window.matchMedia(SIDE_QUERY).matches;
    const nav = rectOf(".app-nav-bar");
    const list = rectOf("#map-list");
    const chips = rectOf(".map-chips");
    const picker = rectOf(".statement-picker");
    const controls = rectOf(".map-ctl");
    let top = 0;
    let right = 0;
    let bottom = 0;
    let left = 0;

    if (nav) {
        if (side) {
            left = Math.max(left, nav.right);
        } else {
            bottom = Math.max(bottom, window.innerHeight - nav.top);
        }
    }

    if (list) {
        if (side) {
            left = Math.max(left, list.right);
        } else {
            bottom = Math.max(bottom, window.innerHeight - list.top);
        }
    }

    if (chips) {
        top = Math.max(top, chips.bottom);
    }

    if (picker) {
        top = Math.max(top, picker.bottom);
    }

    if (controls) {
        right = Math.max(right, window.innerWidth - controls.left);
    }

    return { top: top + EDGE_GAP, right: right + EDGE_GAP, bottom: bottom + EDGE_GAP, left: left + EDGE_GAP };
}

function MapPage() {
    const navigate = useNavigate();
    const { filter, statement, place } = Route.useSearch();
    const data = useMapDrops();
    const wide = useWide();
    const [listOpen, setListOpen] = useState(true);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const lastPinKeyRef = useRef<string | null>(null);
    const focusPendingRef = useRef(false);
    const active = filter ?? "all";
    const groups = useMemo(
        () => groupByPlace(filterDrops(data.items, active, statement)),
        [data.items, active, statement],
    );
    const selected = groups.find((group) => group.key === place) ?? null;
    const panelShown = wide ? listOpen : selected !== null;
    const hasDrops = data.items.length > 0;
    const showOlder =
        data.nextCursor !== null &&
        data.items.length >= MAP_AUTO_PAGES * MAP_PAGE_SIZE &&
        data.items.length < MAP_MAX_DROPS;
    const lateError = data.moreError || (hasDrops && data.status === "error" ? data.error : "");
    const hasStatements = data.statements.length > 0 || data.earlierCount > 0;
    const chosenStatement = data.statements.find((kept) => kept.id === statement) ?? null;

    // the chosen place goes in the address; its list heading takes focus
    function select(key: string | null) {
        lastPinKeyRef.current = key;

        if (key && wide) {
            setListOpen(true);
        }

        focusPendingRef.current = key !== null;
        void navigate({ to: ".", search: (prev) => ({ ...prev, place: key ?? undefined }), replace: true });
    }

    // the heading takes focus once the chosen place's list is on screen; on phones the sheet
    // mounts only after the address has changed, so a fixed delay is not enough
    const selectedKey = selected?.key ?? null;

    useEffect(() => {
        if (!focusPendingRef.current || selectedKey === null) {
            return;
        }

        focusPendingRef.current = false;
        headingRef.current?.focus();
    }, [selectedKey]);

    // clear the place and hand focus back to its pin, or to the page heading
    function closeSelection() {
        const key = lastPinKeyRef.current ?? place ?? null;

        void navigate({ to: ".", search: (prev) => ({ ...prev, place: undefined }), replace: true });
        requestAnimationFrame(() => {
            const pin = key ? document.querySelector<HTMLElement>(`[data-place="${CSS.escape(key)}"]`) : null;

            (pin ?? document.getElementById("map-title"))?.focus();
        });
    }

    // a new filter keeps the place only while it still has matching drops
    function handleFilter(next: InboxFilter) {
        const kept = groupByPlace(filterDrops(data.items, next, statement)).some((group) => group.key === place);

        void navigate({
            to: ".",
            search: (prev) => ({
                ...prev,
                filter: next === "all" ? undefined : next,
                place: kept ? prev.place : undefined,
            }),
            replace: true,
        });
    }

    // a new statement keeps the place only while it still has matching drops
    function handleStatement(next: string | undefined) {
        const kept = groupByPlace(filterDrops(data.items, active, next)).some((group) => group.key === place);

        void navigate({
            to: ".",
            search: (prev) => ({ ...prev, statement: next, place: kept ? prev.place : undefined }),
            replace: true,
        });
    }

    // every drop again: no filter and no statement
    function handleShowAll() {
        void navigate({
            to: ".",
            search: (prev) => ({ ...prev, filter: undefined, statement: undefined, place: undefined }),
            replace: true,
        });
    }

    // Escape closes the chosen place
    useEffect(() => {
        if (!selected) {
            return;
        }

        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") {
                closeSelection();
            }
        }

        document.addEventListener("keydown", handleKey);

        return () => {
            document.removeEventListener("keydown", handleKey);
        };
    });

    let panelTitle = LIST_TITLES[active];

    if (statement === "earlier") {
        panelTitle = EARLIER_TITLE;
    } else if (chosenStatement) {
        panelTitle = `“${chosenStatement.text}”`;
    }
    let panelItems = groups.flatMap((group) => group.items);

    if (selected) {
        panelTitle = `Near ${selected.name ?? "Unnamed place"}`;
        panelItems = selected.items;
    }

    return (
        <div className="map-page" data-list={wide && !listOpen ? "closed" : undefined}>
            {/* map stage */}
            <section className="section map-stage" aria-labelledby="map-title">
                {/* heading, filters and list toggle */}
                <div className="sub-section map-head">
                    <div className="placement">
                        <div className="container">
                            <h1 id="map-title" className="inbox-sr" tabIndex={-1}>
                                Map
                            </h1>
                        </div>
                    </div>
                    {hasDrops ? <FilterChips className="map-chips" value={active} onChange={handleFilter} /> : null}
                    {hasDrops && hasStatements ? (
                        <StatementPicker
                            statements={data.statements}
                            earlierCount={data.earlierCount}
                            value={statement}
                            onChange={handleStatement}
                        />
                    ) : null}
                    {showOlder || lateError ? (
                        <div className="placement map-older">
                            {showOlder ? (
                                <div className="container">
                                    <button
                                        className="auth-btn auth-btn-paper"
                                        type="button"
                                        disabled={data.loadingMore}
                                        onClick={() => {
                                            void data.loadOlder();
                                        }}
                                    >
                                        {data.loadingMore ? "Loading" : "Load older drops"}
                                    </button>
                                </div>
                            ) : null}
                            <div className="container">
                                <p className="auth-error map-older-error" role="alert">
                                    {lateError}
                                </p>
                            </div>
                        </div>
                    ) : null}
                    {wide && hasDrops ? (
                        <div className="placement map-collapse">
                            <div className="container">
                                <button
                                    className="map-collapse-btn"
                                    type="button"
                                    aria-controls="map-list"
                                    aria-expanded={listOpen}
                                    aria-label={listOpen ? "Hide the list" : "Show the list"}
                                    onClick={() => {
                                        setListOpen((current) => !current);
                                    }}
                                >
                                    {listOpen ? (
                                        <CaretLeft weight="bold" aria-hidden="true" />
                                    ) : (
                                        <CaretRight weight="bold" aria-hidden="true" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>

                {hasDrops ? (
                    // the map
                    <div className="sub-section map-fill">
                        <div className="placement">
                            <div className="container map-canvas">
                                <Suspense
                                    fallback={
                                        <p className="auth-status map-wait" role="status">
                                            Loading map
                                        </p>
                                    }
                                >
                                    <AllDropsMap
                                        groups={groups}
                                        selectedKey={selected ? selected.key : null}
                                        onSelect={select}
                                        getInsets={measureInsets}
                                    />
                                </Suspense>
                            </div>
                        </div>
                    </div>
                ) : null}

                {data.status === "error" && !hasDrops ? (
                    // load failed
                    <div className="sub-section map-state">
                        <div className="placement auth-stack">
                            <div className="container">
                                <p className="auth-error" role="alert">
                                    {data.error}
                                </p>
                            </div>
                            <div className="container">
                                <button className="auth-btn auth-btn-paper" type="button" onClick={data.retry}>
                                    Try again
                                </button>
                            </div>
                        </div>
                    </div>
                ) : !hasDrops && (data.status !== "ready" || data.loadingMore) ? (
                    // first load
                    <div className="sub-section map-state" aria-busy="true">
                        <div className="placement">
                            <div className="container">
                                <p className="auth-status" role="status">
                                    Loading your drops
                                </p>
                            </div>
                        </div>
                    </div>
                ) : !hasDrops ? (
                    // no drops yet
                    <div className="sub-section map-state map-empty">
                        <div className="placement inbox-empty-card">
                            <div className="container">
                                <div className="inbox-patch" aria-hidden="true" />
                            </div>
                            <div className="container">
                                <h2 className="inbox-empty-title">No drops on the map yet</h2>
                            </div>
                            <div className="container">
                                <p className="inbox-empty-copy">Drops show up at the place they were sent from.</p>
                            </div>
                            <div className="container">
                                <Link className="auth-btn auth-btn-ink inbox-btn-large" to="/my-link">
                                    <LinkSimple className="inbox-cta-icon" weight="bold" aria-hidden="true" />
                                    Go to My link
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : groups.length === 0 && (filter || statement) ? (
                    // nothing matches the filter or the statement
                    <div className="sub-section map-note">
                        <div className="placement map-note-card">
                            <div className="container">
                                <p className="map-note-title">{filter ? NO_MATCH[filter] : NO_STATEMENT_MATCH}</p>
                            </div>
                            <div className="container">
                                <button className="auth-btn auth-btn-paper" type="button" onClick={handleShowAll}>
                                    Show all drops
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </section>

            {hasDrops && panelShown ? (
                <MapPanel
                    title={panelTitle}
                    count={panelItems.length}
                    items={panelItems}
                    search={{ filter, statement }}
                    closable={selected !== null}
                    onClose={closeSelection}
                    headingRef={headingRef}
                />
            ) : null}
        </div>
    );
}
