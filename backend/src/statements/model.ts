// Statements table and the rules for timed statements. A statement is the line an owner
// puts up to open their link for a fixed time. It is running while it has not been
// ended and its end time is still ahead of the database clock, so no background job is
// needed to close it. The text rule, the end body and the one owner-facing serializer
// live here, with a separate public shape that carries no id and no counts. The SQL
// fragments for "running" and "seconds left" are shared with the drops repository.
import { sql, type SQL } from "drizzle-orm";
import { check, index, pgTable, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";
import { profiles } from "../profiles/model.js";

export const statements = pgTable(
    "statements",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        profileId: uuid("profile_id")
            .notNull()
            .references(() => profiles.id, { onDelete: "cascade" }),
        text: varchar("text", { length: 120 }).notNull(),
        startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
        endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
        endedAt: timestamp("ended_at", { withTimezone: true }),
    },
    (table) => [
        check("statements_ends_after_start_check", sql`${table.endsAt} > ${table.startedAt}`),
        check(
            "statements_ended_after_start_check",
            sql`${table.endedAt} is null or ${table.endedAt} >= ${table.startedAt}`,
        ),
        index("statements_profile_started_idx").on(table.profileId, table.startedAt.desc(), table.id.desc()),
        uniqueIndex("statements_one_open_idx")
            .on(table.profileId)
            .where(sql`${table.endedAt} is null`),
    ],
);

export const STATEMENT_DURATION_SECONDS = 2 * 60 * 60;
export const STATEMENT_MAX = 120;
export const STATEMENT_MESSAGE = "Write a statement up to 120 characters.";
export const STATEMENT_ENDED_MESSAGE = "That statement has already ended.";
export const END_BODY_MESSAGE = "Send ended as true.";

const CONTROL_PATTERN = /[\u0000-\u001F\u007F]/;

// whitespace runs (newlines too) become one space, counted in code points
export const statementTextSchema = z
    .string(STATEMENT_MESSAGE)
    .transform((value) => value.replace(/\s+/g, " ").trim())
    .refine((value) => {
        const length = Array.from(value).length;

        return length >= 1 && length <= STATEMENT_MAX && !CONTROL_PATTERN.test(value);
    }, STATEMENT_MESSAGE);

export const createStatementSchema = z.strictObject({ text: statementTextSchema }, STATEMENT_MESSAGE);

export const endStatementSchema = z.strictObject({ ended: z.literal(true, END_BODY_MESSAGE) }, END_BODY_MESSAGE);

export const statementIdSchema = z.uuid();

export type CreateStatementInput = z.infer<typeof createStatementSchema>;
export type EndStatementInput = z.infer<typeof endStatementSchema>;

// the running condition, judged by the database clock
export function runningSql(table: typeof statements): SQL<boolean> {
    return sql<boolean>`(${table.endedAt} is null and ${table.endsAt} > now())`;
}

// whole seconds until the end time, never below zero
export function secondsLeftSql(table: typeof statements): SQL<number> {
    return sql<number>`(case when ${table.endedAt} is not null then 0 else greatest(0, ceil(extract(epoch from ${table.endsAt} - now()))) end)::int`;
}

export type StatementRow = typeof statements.$inferSelect;

export type StatementView = StatementRow & {
    running: boolean;
    secondsLeft: number;
    dropCount: number;
};

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

// the one owner-facing serializer: create, end, current and the inbox sections
export function toStatement(view: StatementView): Statement {
    return {
        id: view.id,
        text: view.text,
        started_at: view.startedAt.toISOString(),
        ends_at: view.endsAt.toISOString(),
        ended_at: view.endedAt ? view.endedAt.toISOString() : null,
        running: view.running,
        seconds_left: view.secondsLeft,
        drop_count: view.dropCount,
    };
}

// the public shape on purpose carries no id and no counts
export function toPublicStatement(view: Pick<StatementView, "text" | "endsAt" | "secondsLeft">): PublicStatement {
    return {
        text: view.text,
        ends_at: view.endsAt.toISOString(),
        seconds_left: view.secondsLeft,
    };
}
