// Drop rules and shapes for the web app. The message limit, the location rule and every error
// message are copied from backend/src/drops/model.ts and must stay in step with that file, so
// the same input fails the same way on both sides. The server still decides; these checks
// only save a round trip. Coordinates are sent as decimal strings and stay in memory only.

export const MESSAGE_MAX = 280;
export const MESSAGE_MESSAGE = "Write a message up to 280 characters.";
export const LOCATION_MESSAGE = "That location is not valid.";
export const LINK_PAUSED_MESSAGE = "This link is not taking drops right now.";

const COORDINATE_PATTERN = /^-?\d{1,3}(\.\d{1,15})?$/;
const LAT_MAX = 90;
const LNG_MAX = 180;
const COORDINATE_DECIMALS = 6;

export type LocationSource = "gps" | "manual";

export type DropLocation = { latitude: number; longitude: number; source: LocationSource };

export type DropDraft = { message: string; location: DropLocation | null };

export type DraftCheck = { ok: true } | { ok: false; message: string };

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

// the server's rules: message trimmed, 1 to 280 code points, no null character; a location
// needs both coordinates in range and a known source
export function validateDraft(draft: DropDraft): DraftCheck {
    const message = typeof draft.message === "string" ? draft.message.trim() : "";
    const length = Array.from(message).length;

    if (length < 1 || length > MESSAGE_MAX || message.includes("\u0000")) {
        return { ok: false, message: MESSAGE_MESSAGE };
    }

    const { location } = draft;

    if (location === null) {
        return { ok: true };
    }

    const sourceOk = location.source === "gps" || location.source === "manual";

    if (!sourceOk || !validCoordinate(location.latitude, LAT_MAX) || !validCoordinate(location.longitude, LNG_MAX)) {
        return { ok: false, message: LOCATION_MESSAGE };
    }

    return { ok: true };
}
