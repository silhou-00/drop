// Drop table and the input rules for sending a drop. The error messages are exported as
// constants so the frontend can show the same text for the same failure. The send body
// arrives as multipart text fields, so numbers are decimal strings until parsed here.
import { sql } from "drizzle-orm";
import { boolean, char, check, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { profiles } from "../profiles/model.js";
import { geographyPoint } from "../shared/db/geography.js";

export const drops = pgTable(
    "drops",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        recipientId: uuid("recipient_id")
            .notNull()
            .references(() => profiles.id, { onDelete: "cascade" }),
        message: varchar("message", { length: 280 }).notNull(),
        location: geographyPoint("location"),
        locationSource: text("location_source", { enum: ["gps", "manual"] }),
        locationName: varchar("location_name", { length: 100 }),
        senderKey: char("sender_key", { length: 64 }).notNull(),
        deviceKey: char("device_key", { length: 64 }),
        isRead: boolean("is_read").notNull().default(false),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        check("drops_location_source_check", sql`${table.locationSource} in ('gps', 'manual')`),
        check("drops_location_pair_check", sql`(${table.location} is null) = (${table.locationSource} is null)`),
        index("drops_recipient_created_idx").on(table.recipientId, table.createdAt.desc()),
        index("drops_location_gist").using("gist", table.location),
    ],
);

export const MESSAGE_MAX = 280;
export const MESSAGE_MESSAGE = "Write a message up to 280 characters.";
export const LOCATION_MESSAGE = "That location is not valid.";
export const LINK_PAUSED_MESSAGE = "This link is not taking drops right now.";

const COORDINATE_PATTERN = /^-?\d{1,3}(\.\d{1,15})?$/;
const LAT_MAX = 90;
const LNG_MAX = 180;

// message counted in code points, so an emoji is one character
const messageSchema = z
    .string(MESSAGE_MESSAGE)
    .trim()
    .refine((value) => {
        const length = Array.from(value).length;

        return length >= 1 && length <= MESSAGE_MAX && !value.includes("\u0000");
    }, MESSAGE_MESSAGE);

// decimal string to number inside the allowed range
function coordinate(max: number) {
    return z
        .string(LOCATION_MESSAGE)
        .regex(COORDINATE_PATTERN, LOCATION_MESSAGE)
        .transform(Number)
        .refine((value) => Math.abs(value) <= max, LOCATION_MESSAGE)
        .optional();
}

export const sendDropSchema = z
    .strictObject({
        message: messageSchema,
        latitude: coordinate(LAT_MAX),
        longitude: coordinate(LNG_MAX),
        location_source: z.enum(["gps", "manual"], LOCATION_MESSAGE).optional(),
    })
    .refine((value) => {
        const hasLat = value.latitude !== undefined;

        return hasLat === (value.longitude !== undefined) && hasLat === (value.location_source !== undefined);
    }, LOCATION_MESSAGE);

export type SendDropInput = z.infer<typeof sendDropSchema>;
