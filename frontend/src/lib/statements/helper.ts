// Time labels for statements. A running statement shows how long it has left in its largest
// useful units ("1h 20m left", "4m left", "45s left"), and the start button names the fixed
// length ("2 hours"), worked out from the shared constant so the two can never disagree.
import { STATEMENT_DURATION_SECONDS } from "./model";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

// the time left, rounded up so it never reads 0 before the end
export function timeLeftLabel(ms: number) {
    const seconds = Math.max(0, Math.ceil(ms / 1000));

    if (seconds >= HOUR) {
        const hours = Math.floor(seconds / HOUR);
        const minutes = Math.floor((seconds % HOUR) / MINUTE);

        return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
    }

    if (seconds >= MINUTE) {
        const minutes = Math.ceil(seconds / MINUTE);

        return minutes >= 60 ? "1h left" : `${minutes}m left`;
    }

    return `${seconds}s left`;
}

// "2 hours" from the statement length
export function durationLabel() {
    const hours = STATEMENT_DURATION_SECONDS / HOUR;

    if (Number.isInteger(hours)) {
        return hours === 1 ? "1 hour" : `${hours} hours`;
    }

    return `${Math.round(STATEMENT_DURATION_SECONDS / MINUTE)} minutes`;
}
