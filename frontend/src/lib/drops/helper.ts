// Time labels for the inbox. A drop's creation time is shown as a short relative label on the
// list and the detail page, with the full local date and time beside it for a title or a time
// element. Both read the ISO time the server sends and never change it.

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const shortDateYear = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });
const fullDate = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

// "just now", "5 minutes ago", "yesterday", then a short date after a week
export function relativeTime(iso: string, now = Date.now()) {
    const at = new Date(iso);
    const seconds = Math.round((now - at.getTime()) / 1000);

    if (Number.isNaN(seconds)) {
        return "";
    }

    if (seconds < MINUTE) {
        return "just now";
    }

    if (seconds < HOUR) {
        return relative.format(-Math.floor(seconds / MINUTE), "minute");
    }

    if (seconds < DAY) {
        return relative.format(-Math.floor(seconds / HOUR), "hour");
    }

    if (seconds < WEEK) {
        return relative.format(-Math.floor(seconds / DAY), "day");
    }

    return at.getFullYear() === new Date(now).getFullYear() ? shortDate.format(at) : shortDateYear.format(at);
}

// full local date and time
export function fullTime(iso: string) {
    const at = new Date(iso);

    return Number.isNaN(at.getTime()) ? "" : fullDate.format(at);
}
