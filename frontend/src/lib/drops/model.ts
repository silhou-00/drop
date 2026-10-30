// Drop rules and shapes for the web app. The message limit, the location rule, the photo limit
// and every error message are copied from backend/src/drops/model.ts and backend/src/photos/
// model.ts and must stay in step with them, so the same input fails the same way on both sides.
// Every drop carries a GPS location and may carry one photo. The server still decides; these
// checks only save a round trip. The photo is checked by its stated type and size here, and the
// server checks it again from its bytes. Coordinates are sent as decimal strings and stay in
// memory only. The inbox shapes and messages match the backend's inbox item and query rules,
// and a drop id is checked as a UUID before it is put in any request path. The inbox filter is
// one of all, unread or photos; each inbox page also carries the inbox-wide unread count, which
// does not depend on the filter or the page.

export const MESSAGE_MAX = 280;
export const MESSAGE_MESSAGE = "Write a message up to 280 characters.";
export const LOCATION_MESSAGE = "That location is not valid.";
export const LOCATION_REQUIRED_MESSAGE = "Turn on your location to send a drop.";
export const LINK_PAUSED_MESSAGE = "This link is not taking drops right now.";
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PHOTO_MESSAGE = "Use a JPEG, PNG or WebP photo up to 8 MB.";
export const PHOTO_UNREADABLE_MESSAGE = "That photo could not be read.";
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const LIMIT_MESSAGE = "Choose a page size from 1 to 50.";
export const CURSOR_MESSAGE = "That page link is not valid.";
export const IS_READ_MESSAGE = "Send is_read as true or false.";
export const FILTER_MESSAGE = "Choose a filter: all, unread or photos.";

export const INBOX_FILTERS = ["all", "unread", "photos"] as const;

const DROP_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COORDINATE_PATTERN = /^-?\d{1,3}(\.\d{1,15})?$/;
const LAT_MAX = 90;
const LNG_MAX = 180;
const COORDINATE_DECIMALS = 6;

export type LocationSource = "gps";

export type DropLocation = { latitude: number; longitude: number; source: LocationSource };

export type DropDraft = { message: string; location: DropLocation; photo: File | null };

export type DraftCheck = { ok: true } | { ok: false; message: string };

export type InboxItem = {
    id: string;
    message: string;
    location: { lat: number; lng: number; name: string | null; source: LocationSource };
    has_photo: boolean;
    is_read: boolean;
    created_at: string;
};

export type InboxPage = { items: InboxItem[]; next_cursor: string | null; unread_count: number };

export type InboxFilter = (typeof INBOX_FILTERS)[number];

// a drop id in the server's UUID form; anything else is not-found without a request
export function isDropId(value: string) {
    return DROP_ID_PATTERN.test(value);
}

// one of the inbox filters the server accepts
export function isInboxFilter(value: unknown): value is InboxFilter {
    return typeof value === "string" && (INBOX_FILTERS as readonly string[]).includes(value);
}

// decimal string for a coordinate, never in exponent form
export function formatCoordinate(value: number) {
    return value.toFixed(COORDINATE_DECIMALS);
}

function validCoordinate(value: number, max: number) {
    if (!Number.isFinite(value)) {
        return false;
    }

    const text = formatCoordinate(value);

    return COORDINATE_PATTERN.test(text) && Math.abs(Number(text)) <= max;
}

// a photo of an allowed type, 1 byte up to the size cap
export function validPhoto(file: File) {
    return PHOTO_TYPES.includes(file.type) && file.size >= 1 && file.size <= PHOTO_MAX_BYTES;
}

// the server's rules in the server's order: message, latitude, longitude, a gps source, then
// the photo; a missing location or another source asks for location
export function validateDraft(draft: DropDraft): DraftCheck {
    const message = typeof draft.message === "string" ? draft.message.trim() : "";
    const length = Array.from(message).length;

    if (length < 1 || length > MESSAGE_MAX || message.includes("\u0000")) {
        return { ok: false, message: MESSAGE_MESSAGE };
    }

    const { location } = draft;

    if (!location) {
        return { ok: false, message: LOCATION_REQUIRED_MESSAGE };
    }

    if (!validCoordinate(location.latitude, LAT_MAX) || !validCoordinate(location.longitude, LNG_MAX)) {
        return { ok: false, message: LOCATION_MESSAGE };
    }

    if (location.source !== "gps") {
        return { ok: false, message: LOCATION_REQUIRED_MESSAGE };
    }

    if (draft.photo && !validPhoto(draft.photo)) {
        return { ok: false, message: PHOTO_MESSAGE };
    }

    return { ok: true };
}
