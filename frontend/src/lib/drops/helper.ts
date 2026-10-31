// Time labels and grouping for the inbox. A list card shows a compact age ("now", "2m", "3h",
// "1d", then a short date), the drop page shows the day and clock time, and the full local date
// and time sits beside both for a title or a time element. The list splits into one section per
// statement the drops were sent under, keeping the server's order, with the drops from before
// statements last. All read the ISO time the server sends and never change it. For the map,
// drops sent from the same ~150 m cell share exact coordinates, so they group by a key built
// from those coordinates; the filter chips and the statement picker narrow the kept drops on
// the page without asking the server again.
import type { InboxFilter, InboxItem } from "@/lib/drops/model";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const shortDateYear = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
const clock = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" });
const fullDate = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

function parse(iso: string) {
    const at = new Date(iso);

    return Number.isNaN(at.getTime()) ? null : at;
}

// local calendar day as a comparable number
function dayKey(at: Date) {
    return at.getFullYear() * 10000 + at.getMonth() * 100 + at.getDate();
}

function datePart(at: Date, now: Date) {
    return at.getFullYear() === now.getFullYear() ? shortDate.format(at) : shortDateYear.format(at);
}

// "now", "2m", "3h", "1d" up to "6d", then "Oct 27" (with the year when it is not this year)
export function shortAgo(iso: string, now = Date.now()) {
    const at = parse(iso);

    if (!at) {
        return "";
    }

    const seconds = Math.max(0, Math.round((now - at.getTime()) / 1000));

    if (seconds < MINUTE) {
        return "now";
    }

    if (seconds < HOUR) {
        return `${Math.floor(seconds / MINUTE)}m`;
    }

    if (seconds < DAY) {
        return `${Math.floor(seconds / HOUR)}h`;
    }

    if (seconds < WEEK) {
        return `${Math.floor(seconds / DAY)}d`;
    }

    return datePart(at, new Date(now));
}

// "Today, 2:26 PM", "Yesterday, 2:26 PM", or "Oct 27, 2:26 PM"
export function dayTime(iso: string, now = Date.now()) {
    const at = parse(iso);

    if (!at) {
        return "";
    }

    const today = new Date(now);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    let day = datePart(at, today);

    if (dayKey(at) === dayKey(today)) {
        day = "Today";
    } else if (dayKey(at) === dayKey(yesterday)) {
        day = "Yesterday";
    }

    return `${day}, ${clock.format(at)}`;
}

export type StatementGroup = { id: string | null; items: InboxItem[] };

// drops by the statement they were sent under, in order of first appearance; the drops from
// before statements (no id) come last
export function groupByStatement(items: InboxItem[]) {
    const groups = new Map<string, StatementGroup>();
    const earlier: InboxItem[] = [];

    for (const item of items) {
        if (item.statement_id === null) {
            earlier.push(item);
            continue;
        }

        let group = groups.get(item.statement_id);

        if (!group) {
            group = { id: item.statement_id, items: [] };
            groups.set(item.statement_id, group);
        }

        group.items.push(item);
    }

    const result = [...groups.values()];

    if (earlier.length > 0) {
        result.push({ id: null, items: earlier });
    }

    return result;
}

// full local date and time
export function fullTime(iso: string) {
    const at = parse(iso);

    return at ? fullDate.format(at) : "";
}

export type PlaceGroup = {
    key: string;
    lat: number;
    lng: number;
    name: string | null;
    items: InboxItem[];
    unread: number;
};

// "lat,lng" at six decimals, the same for every drop in one cell
export function placeKey(lat: number, lng: number) {
    return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

// drops by place, in the order each place first appears; the name is the first one known
export function groupByPlace(items: InboxItem[]) {
    const groups = new Map<string, PlaceGroup>();

    for (const item of items) {
        const { lat, lng, name } = item.location;
        const key = placeKey(lat, lng);
        let group = groups.get(key);

        if (!group) {
            group = { key, lat, lng, name: null, items: [], unread: 0 };
            groups.set(key, group);
        }

        group.items.push(item);

        if (!group.name && name) {
            group.name = name;
        }

        if (!item.is_read) {
            group.unread += 1;
        }
    }

    return [...groups.values()];
}

// the kept drops that match a filter chip and, when given, one statement or "earlier"
export function filterDrops(items: InboxItem[], filter: InboxFilter, statement?: string) {
    let kept = items;

    if (statement) {
        const id = statement === "earlier" ? null : statement;

        kept = kept.filter((item) => item.statement_id === id);
    }

    if (filter === "unread") {
        return kept.filter((item) => !item.is_read);
    }

    if (filter === "photos") {
        return kept.filter((item) => item.has_photo);
    }

    return kept;
}
