// Drop table and the input rules for sending and reading drops. Every drop must carry a
// GPS location. The error messages are exported as constants so the frontend can show the
// same text for the same failure. The optional photo is checked here for size only; the
// photos slice reads the bytes. The send body arrives as multipart text fields, so
// numbers are decimal strings until parsed here. The inbox rules live here too: the list
// query with its page size, filter (all, unread or photos), optional statement scope (a
// statement id or "earlier") and opaque page cursor, the read flag body and the one
// serializer for the inbox item. The counts the list reports are not part of the query,
// they are counted in the repository. Each drop carries the id of the statement it was
// sent under, null for a drop from before statements. A malformed drop id is answered
// 404, not 422, so ids cannot be probed.
import { sql } from "drizzle-orm";
import { boolean, char, check, index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { PHOTO_MAX_BYTES, PHOTO_MESSAGE } from "../photos/model.js";
import { profiles } from "../profiles/model.js";
import { geographyPoint } from "../shared/db/geography.js";
import { statements } from "../statements/model.js";

export const drops = pgTable(
    "drops",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        recipientId: uuid("recipient_id")
            .notNull()
            .references(() => profiles.id, { onDelete: "cascade" }),
        message: varchar("message", { length: 280 }).notNull(),
        location: geographyPoint("location").notNull(),
        locationSource: text("location_source", { enum: ["gps"] }).notNull(),
        locationName: varchar("location_name", { length: 100 }),
        photoKey: text("photo_key"),
        statementId: uuid("statement_id").references(() => statements.id, { onDelete: "set null" }),
        senderKey: char("sender_key", { length: 64 }).notNull(),
        deviceKey: char("device_key", { length: 64 }),
        isRead: boolean("is_read").notNull().default(false),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        check("drops_location_source_check", sql`${table.locationSource} in ('gps')`),
        index("drops_recipient_created_idx").on(table.recipientId, table.createdAt.desc()),
        index("drops_location_gist").using("gist", table.location),
        index("drops_statement_created_idx").on(table.statementId, table.createdAt.desc(), table.id.desc()),
    ],
);

export const MESSAGE_MAX = 280;
export const MESSAGE_MESSAGE = "Write a message up to 280 characters.";
export const LOCATION_MESSAGE = "That location is not valid.";
export const LOCATION_REQUIRED_MESSAGE = "Turn on your location to send a drop.";
export const LINK_CLOSED_MESSAGE = "This link is not taking drops right now.";
export const STATEMENT_FILTER_MESSAGE = "That statement is not valid.";

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

// decimal string to number inside the allowed range, required
function coordinate(max: number) {
    return z
        .string(LOCATION_REQUIRED_MESSAGE)
        .regex(COORDINATE_PATTERN, LOCATION_MESSAGE)
        .transform(Number)
        .refine((value) => Math.abs(value) <= max, LOCATION_MESSAGE);
}

// one uploaded file of 1 byte up to the size cap; a string or a list of files fails
const photoSchema = z
    .custom<File>((value) => value instanceof File && value.size >= 1 && value.size <= PHOTO_MAX_BYTES, PHOTO_MESSAGE)
    .optional();

export const sendDropSchema = z.strictObject({
    message: messageSchema,
    latitude: coordinate(LAT_MAX),
    longitude: coordinate(LNG_MAX),
    location_source: z.literal("gps", LOCATION_REQUIRED_MESSAGE),
    photo: photoSchema,
});

export type SendDropInput = z.infer<typeof sendDropSchema>;

export const LIMIT_MESSAGE = "Choose a page size from 1 to 50.";
export const CURSOR_MESSAGE = "That page link is not valid.";
export const IS_READ_MESSAGE = "Send is_read as true or false.";
export const FILTER_MESSAGE = "Choose a filter: all, unread or photos.";

export const INBOX_FILTERS = ["all", "unread", "photos"] as const;

export type InboxFilter = (typeof INBOX_FILTERS)[number];

export const INBOX_LIMIT_DEFAULT = 20;
export const INBOX_LIMIT_MAX = 50;

const CURSOR_MAX_LENGTH = 120;
const CURSOR_PATTERN = /^[A-Za-z0-9_-]+$/;
const CURSOR_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;

export type InboxCursor = {
    createdAt: string;
    id: string;
};

export const dropIdSchema = z.uuid();

// opaque page marker: base64url of the last item's time (microseconds) and id
export function encodeCursor({ createdAt, id }: InboxCursor): string {
    return Buffer.from(`${createdAt}|${id}`, "utf8").toString("base64url");
}

function decodeCursor(value: string): InboxCursor | null {
    if (value.length > CURSOR_MAX_LENGTH || !CURSOR_PATTERN.test(value)) {
        return null;
    }

    const [createdAt, id, ...rest] = Buffer.from(value, "base64url").toString("utf8").split("|");

    if (rest.length > 0 || !createdAt || !id) {
        return null;
    }

    if (
        !CURSOR_TIME_PATTERN.test(createdAt) ||
        Number.isNaN(Date.parse(createdAt)) ||
        !dropIdSchema.safeParse(id).success
    ) {
        return null;
    }

    return { createdAt, id };
}

// page size as a decimal string in range, default 20
const limitSchema = z
    .string(LIMIT_MESSAGE)
    .regex(/^\d{1,3}$/, LIMIT_MESSAGE)
    .transform(Number)
    .refine((value) => value >= 1 && value <= INBOX_LIMIT_MAX, LIMIT_MESSAGE)
    .default(INBOX_LIMIT_DEFAULT);

const cursorSchema = z
    .string(CURSOR_MESSAGE)
    .transform((value, context) => {
        const decoded = decodeCursor(value);

        if (!decoded) {
            context.addIssue({ code: "custom", message: CURSOR_MESSAGE });

            return z.NEVER;
        }

        return decoded;
    })
    .optional();

// which drops the list shows, default all
const filterSchema = z.enum(INBOX_FILTERS, FILTER_MESSAGE).default("all");

// one statement by id, or the drops from before statements
const statementScopeSchema = z
    .union([z.uuid(STATEMENT_FILTER_MESSAGE), z.literal("earlier", STATEMENT_FILTER_MESSAGE)], STATEMENT_FILTER_MESSAGE)
    .optional();

export const inboxQuerySchema = z.strictObject({
    limit: limitSchema,
    cursor: cursorSchema,
    filter: filterSchema,
    statement: statementScopeSchema,
});

export type InboxQuery = z.infer<typeof inboxQuerySchema>;

export const readBodySchema = z.strictObject({
    is_read: z.boolean(IS_READ_MESSAGE),
});

export type DropRow = typeof drops.$inferSelect;

export type InboxItem = {
    id: string;
    message: string;
    location: { lat: number; lng: number; name: string | null; source: "gps" };
    has_photo: boolean;
    is_read: boolean;
    statement_id: string | null;
    created_at: string;
};

// the one serializer for the inbox item, used by list, detail and mark read
export function toInboxItem(row: DropRow): InboxItem {
    return {
        id: row.id,
        message: row.message,
        location: {
            lat: row.location.lat,
            lng: row.location.lng,
            name: row.locationName,
            source: row.locationSource,
        },
        has_photo: row.photoKey !== null,
        is_read: row.isRead,
        statement_id: row.statementId,
        created_at: row.createdAt.toISOString(),
    };
}
