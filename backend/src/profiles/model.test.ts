// Tests for the profile input rules: usernames, display names, and the create and
// update bodies, including the exact error messages the frontend mirrors.
import { describe, expect, it } from "vitest";
import {
    DISPLAY_NAME_MESSAGE,
    RESERVED_USERNAMES,
    USERNAME_INVALID_MESSAGE,
    USERNAME_RESERVED_MESSAGE,
    createProfileSchema,
    displayNameSchema,
    updateProfileSchema,
    usernameSchema,
} from "./model.js";

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
    return result.error?.issues[0]?.message;
}

describe("usernameSchema", () => {
    it("accepts valid names and folds case", () => {
        expect(usernameSchema.parse("maya")).toBe("maya");
        expect(usernameSchema.parse("  Maya.Cruz_01  ")).toBe("maya.cruz_01");
        expect(usernameSchema.parse("abc")).toBe("abc");
        expect(usernameSchema.parse("a".repeat(30))).toBe("a".repeat(30));
    });

    it("rejects bad length and characters with the shared message", () => {
        for (const value of ["ab", "a".repeat(31), "has space", "dash-ed", "emoji\u{1F600}", ""]) {
            expect(firstMessage(usernameSchema.safeParse(value))).toBe(USERNAME_INVALID_MESSAGE);
        }
    });

    it("rejects non-strings", () => {
        expect(firstMessage(usernameSchema.safeParse(42))).toBe(USERNAME_INVALID_MESSAGE);
    });

    it("rejects reserved names, in any case", () => {
        expect(firstMessage(usernameSchema.safeParse("admin"))).toBe(USERNAME_RESERVED_MESSAGE);
        expect(firstMessage(usernameSchema.safeParse("Settings"))).toBe(USERNAME_RESERVED_MESSAGE);
        expect(firstMessage(usernameSchema.safeParse("privacy"))).toBe(USERNAME_RESERVED_MESSAGE);
    });

    it("rejects the names of signed-in app pages", () => {
        for (const name of ["inbox", "map", "settings"]) {
            expect(firstMessage(usernameSchema.safeParse(name))).toBe(USERNAME_RESERVED_MESSAGE);
        }
    });

    it("rejects the names the frontend serves as files or folders", () => {
        for (const name of ["brand", "landing", "marble", "favicon.svg", "icons.svg", "index.html", "robots.txt"]) {
            expect(RESERVED_USERNAMES).toContain(name);
            expect(usernameSchema.safeParse(name).success).toBe(false);
        }
    });

    it("never lets a reserved name through", () => {
        for (const name of RESERVED_USERNAMES) {
            expect(usernameSchema.safeParse(name).success).toBe(false);
        }
    });
});

describe("displayNameSchema", () => {
    it("trims and accepts 1 to 50 characters", () => {
        expect(displayNameSchema.parse("  Maya  ")).toBe("Maya");
        expect(displayNameSchema.parse("a".repeat(50))).toBe("a".repeat(50));
    });

    it("rejects empty, blank and too long", () => {
        for (const value of ["", "   ", "a".repeat(51)]) {
            expect(firstMessage(displayNameSchema.safeParse(value))).toBe(DISPLAY_NAME_MESSAGE);
        }
    });
});

describe("createProfileSchema", () => {
    const valid = { username: "Maya", displayName: "Maya Cruz" };

    it("accepts a valid body", () => {
        expect(createProfileSchema.parse(valid)).toEqual({
            username: "maya",
            displayName: "Maya Cruz",
        });
    });

    it("rejects the removed confirmAdult field", () => {
        expect(createProfileSchema.safeParse({ ...valid, confirmAdult: true }).success).toBe(false);
    });

    it("rejects unknown fields", () => {
        expect(createProfileSchema.safeParse({ ...valid, userId: "x" }).success).toBe(false);
    });
});

describe("updateProfileSchema", () => {
    it("accepts one or more known fields", () => {
        expect(updateProfileSchema.parse({ acceptingDrops: false })).toEqual({ acceptingDrops: false });
        expect(updateProfileSchema.parse({ displayName: " Mi ", notifyEmail: true })).toEqual({
            displayName: "Mi",
            notifyEmail: true,
        });
    });

    it("rejects an empty body and unknown fields", () => {
        expect(updateProfileSchema.safeParse({}).success).toBe(false);
        expect(updateProfileSchema.safeParse({ username: "maya" }).success).toBe(false);
    });
});
