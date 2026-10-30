// Profile table and the input rules for profiles. The error messages are exported
// as constants so the frontend can show the same text for the same failure.
import { boolean, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { user } from "../auth/model.js";
import { citext } from "../shared/db/citext.js";

export const profiles = pgTable("profiles", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
        .notNull()
        .unique()
        .references(() => user.id, { onDelete: "cascade" }),
    username: citext("username").notNull().unique(),
    displayName: varchar("display_name", { length: 50 }).notNull(),
    avatarKey: text("avatar_key"),
    acceptingDrops: boolean("accepting_drops").notNull().default(true),
    heatmapEnabled: boolean("heatmap_enabled").notNull().default(false),
    notifyEmail: boolean("notify_email").notNull().default(true),
    ageConfirmedAt: timestamp("age_confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;

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

const USERNAME_PATTERN = /^[a-z0-9_.]+$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const DISPLAY_NAME_MAX = 50;

export const usernameSchema = z
    .string(USERNAME_INVALID_MESSAGE)
    .trim()
    .toLowerCase()
    .min(USERNAME_MIN, USERNAME_INVALID_MESSAGE)
    .max(USERNAME_MAX, USERNAME_INVALID_MESSAGE)
    .regex(USERNAME_PATTERN, USERNAME_INVALID_MESSAGE)
    .refine((value) => !RESERVED_USERNAMES.includes(value), USERNAME_RESERVED_MESSAGE);

export const displayNameSchema = z
    .string(DISPLAY_NAME_MESSAGE)
    .trim()
    .min(1, DISPLAY_NAME_MESSAGE)
    .max(DISPLAY_NAME_MAX, DISPLAY_NAME_MESSAGE);

export const createProfileSchema = z.strictObject({
    username: usernameSchema,
    displayName: displayNameSchema,
});

export const updateProfileSchema = z
    .strictObject({
        displayName: displayNameSchema.optional(),
        acceptingDrops: z.boolean().optional(),
        heatmapEnabled: z.boolean().optional(),
        notifyEmail: z.boolean().optional(),
    })
    .refine((value) => Object.values(value).some((field) => field !== undefined), UPDATE_EMPTY_MESSAGE);

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
