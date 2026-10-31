// Time labels and grouping for the inbox. A list card shows a compact age ("now", "2m", "3h",
// "1d", then a short date), the drop page shows the day and clock time, and the full local date
// and time sits beside both for a title or a time element. The list splits into today and
// earlier by the local calendar day, keeping the server's order. All read the ISO time the
// server sends and never change it. For the map, drops sent from the same ~150 m cell share
// exact coordinates, so they group by a key built from those coordinates; the filter chips
// narrow the kept drops on the page without asking the server again.
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

// drops from today's local day, then the rest, each in the order given
export function groupByDay(items: InboxItem[], now = Date.now()) {
    const todayKey = dayKey(new Date(now));
    const today: InboxItem[] = [];
    const earlier: InboxItem[] = [];

    for (const item of items) {
        const at = parse(item.created_at);

        if (at && dayKey(at) === todayKey) {
            today.push(item);
        } else {
            earlier.push(item);
        }
    }

    return { today, earlier };
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

// the kept drops that match a filter chip
export function filterDrops(items: InboxItem[], filter: InboxFilter) {
    if (filter === "unread") {
        return items.filter((item) => !item.is_read);
    }

    if (filter === "photos") {
        return items.filter((item) => item.has_photo);
    }

    return items;
}
