// Statement rules and shapes for the web app. A statement is the line an owner puts up to open
// their link for a fixed time; the link takes drops only while one is running. The length, the
// time and every message are copied from backend/src/statements/model.ts and must stay in step
// with that file, so the same text fails the same way on both sides. The text is cleaned the
// way the server cleans it: every run of whitespace becomes one space, then it is trimmed, and
// it is counted in code points. The server still decides; this check only saves a round trip.
// The owner's statement and the public one are different shapes: the public one has no id and
// no counts.

export const STATEMENT_DURATION_SECONDS = 2 * 60 * 60;
export const STATEMENT_MAX = 120;
export const STATEMENT_MESSAGE = "Write a statement up to 120 characters.";
export const STATEMENT_ENDED_MESSAGE = "That statement has already ended.";

const CONTROL_MAX = 0x1f;
const DELETE_CODE = 0x7f;

export type Statement = {
    id: string;
    text: string;
    started_at: string;
    ends_at: string;
    ended_at: string | null;
    running: boolean;
    seconds_left: number;
    drop_count: number;
};

export type PublicStatement = {
    text: string;
    ends_at: string;
    seconds_left: number;
};

export type StatementCheck = { ok: true; value: string } | { ok: false; message: string };

// any character below space, or delete
function hasControl(value: string) {
    return Array.from(value).some((char) => {
        const code = char.codePointAt(0) ?? 0;

        return code <= CONTROL_MAX || code === DELETE_CODE;
    });
}

// whitespace runs (newlines too) become one space, then trimmed
export function normalizeStatement(text: string) {
    return text.replace(/\s+/g, " ").trim();
}

// the server's rule: 1 to 120 code points after cleaning, no control characters
export function checkStatement(text: string): StatementCheck {
    const value = normalizeStatement(text);
    const length = Array.from(value).length;

    if (length < 1 || length > STATEMENT_MAX || hasControl(value)) {
        return { ok: false, message: STATEMENT_MESSAGE };
    }

    return { ok: true, value };
}
