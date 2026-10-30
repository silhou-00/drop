// Time labels and grouping for the inbox. A list card shows a compact age ("now", "2m", "3h",
// "1d", then a short date), the drop page shows the day and clock time, and the full local date
// and time sits beside both for a title or a time element. The list splits into today and
// earlier by the local calendar day, keeping the server's order. All read the ISO time the
// server sends and never change it.
import type { InboxItem } from "@/lib/drops/model";

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
