// Profile rules and shapes for the web app. The username rule, the reserved names and every
// error message are copied from backend/src/profiles/model.ts and must stay in step with that
// file, so the same input fails the same way on both sides. The server still decides; these
// checks only save a round trip. The types match what the profile endpoints answer: the public
// profile carries the running statement (or null while the link is closed), the own one does not.
import type { PublicStatement } from "@/lib/statements/model";

export const RESERVED_USERNAMES: readonly string[] = [
    "api",
    "admin",
    "sign-in",
    "signin",
    "sign-up",
    "signup",
    "claim",
    "home",
    "inbox",
    "settings",
    "map",
    "playground",
    "help",
    "about",
    "terms",
    "privacy",
    "safety",
    "drop",
    "drops",
    "me",
    "profile",
    "profiles",
    "login",
    "logout",
    "auth",
    "support",
    "static",
    "assets",
    "brand",
    "landing",
    "marble",
    "favicon.svg",
    "icons.svg",
    "index.html",
    "robots.txt",
];

export const USERNAME_INVALID_MESSAGE = "Use 3 to 30 letters, numbers, dots or underscores.";
export const USERNAME_RESERVED_MESSAGE = "That name is reserved.";
export const USERNAME_TAKEN_MESSAGE = "That name is taken.";
export const DISPLAY_NAME_MESSAGE = "Enter a display name up to 50 characters.";
export const UPDATE_EMPTY_MESSAGE = "Send at least one field to update.";

export const USERNAME_MAX = 30;
export const DISPLAY_NAME_MAX = 50;

const USERNAME_PATTERN = /^[a-z0-9_.]+$/;
const USERNAME_MIN = 3;

type ProfileBase = {
    username: string;
    displayName: string;
    avatarUrl: string | null;
};

// the running statement, or null while the link is closed
export type PublicProfile = ProfileBase & {
    statement: PublicStatement | null;
};

export type OwnProfile = ProfileBase & {
    heatmapEnabled: boolean;
    notifyEmail: boolean;
    createdAt: string;
};

export type CreateProfileInput = { username: string; displayName: string };

export type UpdateProfileInput = {
    displayName?: string;
    heatmapEnabled?: boolean;
    notifyEmail?: boolean;
};

export type UsernameCheck = { ok: true; value: string } | { ok: false; message: string };

// the server's username rule: trimmed, lowercased, then length, characters, reserved
export function checkUsername(input: string): UsernameCheck {
    const value = input.trim().toLowerCase();

    if (value.length < USERNAME_MIN || value.length > USERNAME_MAX || !USERNAME_PATTERN.test(value)) {
        return { ok: false, message: USERNAME_INVALID_MESSAGE };
    }

    if (RESERVED_USERNAMES.includes(value)) {
        return { ok: false, message: USERNAME_RESERVED_MESSAGE };
    }

    return { ok: true, value };
}

// a ?username= search param carried from the landing; set to undefined unless it passes the
// rule, because the router merges the raw search in under the validated one
export function usernameFromSearch(search: Record<string, unknown>): { username?: string } {
    const check = typeof search.username === "string" ? checkUsername(search.username) : null;

    return { username: check?.ok ? check.value : undefined };
}

// the server's display name rule: trimmed, 1 to 50 characters
export function checkDisplayName(input: string) {
    const value = input.trim();

    return value.length >= 1 && value.length <= DISPLAY_NAME_MAX;
}
