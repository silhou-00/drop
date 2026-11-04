// Data access for drops. Insert a drop inside a transaction that locks the recipient's
// profile row and the running statement, so a statement that ends first is seen and the
// insert is refused. The drop is filed under the statement the database found, never
// one the caller names. The inbox queries list (optionally only unread, only with a
// photo, or one statement), count the unread and the earlier drops, read, mark and
// delete a drop; each one filters by recipient and id so a drop that belongs to someone
// else is never matched.
import { and, desc, eq, getTableColumns, isNotNull, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { profiles } from "../profiles/model.js";
import type { LngLat } from "../shared/db/geography.js";
import { runningSql, statements } from "../statements/model.js";
import { drops, type DropRow, type InboxCursor, type InboxFilter } from "./model.js";

export type NewDropRow = {
    recipientId: string;
    message: string;
    location: LngLat;
    locationSource: "gps";
    locationName: string | null;
    photoKey: string | null;
    senderKey: string;
    deviceKey: string;
};

export type InsertDropResult = { status: "inserted"; id: string } | { status: "closed" } | { status: "missing" };

// a listed row carries its time at microsecond precision, for the page cursor
export type ListedDropRow = DropRow & { cursorAt: string };

const CURSOR_AT_SQL = sql<string>`to_char(${drops.createdAt} at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export function createDropRepository(db: NodePgDatabase) {
    async function insertDrop(row: NewDropRow): Promise<InsertDropResult> {
        return db.transaction(async (tx): Promise<InsertDropResult> => {
            const owners = await tx
                .select({ id: profiles.id })
                .from(profiles)
                .where(eq(profiles.id, row.recipientId))
                .for("share");

            if (owners.length === 0) {
                return { status: "missing" };
            }

            const running = await tx
                .select({ id: statements.id })
                .from(statements)
                .where(and(eq(statements.profileId, row.recipientId), runningSql(statements)))
                .limit(1)
                .for("share");

            if (running.length === 0) {
                return { status: "closed" };
            }

            const [created] = await tx
                .insert(drops)
                .values({ ...row, statementId: running[0].id })
                .returning({ id: drops.id });

            return { status: "inserted", id: created.id };
        });
    }

    // newest first; one extra row tells the caller whether another page follows
    async function listForRecipient(
        profileId: string,
        limit: number,
        cursor: InboxCursor | undefined,
        filter: InboxFilter,
        statement?: string,
    ): Promise<ListedDropRow[]> {
        const after = cursor
            ? sql`(${drops.createdAt}, ${drops.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
            : undefined;
        const narrow =
            filter === "unread" ? eq(drops.isRead, false) : filter === "photos" ? isNotNull(drops.photoKey) : undefined;

        const scope =
            statement === undefined
                ? undefined
                : statement === "earlier"
                  ? isNull(drops.statementId)
                  : eq(drops.statementId, statement);

        return db
            .select({ ...getTableColumns(drops), cursorAt: CURSOR_AT_SQL })
            .from(drops)
            .where(and(eq(drops.recipientId, profileId), narrow, scope, after))
            .orderBy(desc(drops.createdAt), desc(drops.id))
            .limit(limit + 1);
    }

    // every unread drop and every drop from before statements, whatever the list filter
    async function countInbox(profileId: string): Promise<{ unread: number; earlier: number }> {
        const rows = await db
            .select({
                unread: sql<number>`(count(*) filter (where not ${drops.isRead}))::int`,
                earlier: sql<number>`(count(*) filter (where ${drops.statementId} is null))::int`,
            })
            .from(drops)
            .where(eq(drops.recipientId, profileId));

        return { unread: rows[0]?.unread ?? 0, earlier: rows[0]?.earlier ?? 0 };
    }

    async function findForRecipient(profileId: string, id: string): Promise<DropRow | null> {
        const rows = await db
            .select()
            .from(drops)
            .where(and(eq(drops.recipientId, profileId), eq(drops.id, id)))
            .limit(1);

        return rows[0] ?? null;
    }

    async function setRead(profileId: string, id: string, isRead: boolean): Promise<DropRow | null> {
        const rows = await db
            .update(drops)
            .set({ isRead })
            .where(and(eq(drops.recipientId, profileId), eq(drops.id, id)))
            .returning();

        return rows[0] ?? null;
    }

    async function deleteForRecipient(profileId: string, id: string): Promise<{ photoKey: string | null } | null> {
        const rows = await db
            .delete(drops)
            .where(and(eq(drops.recipientId, profileId), eq(drops.id, id)))
            .returning({ photoKey: drops.photoKey });

        return rows[0] ?? null;
    }

    return { insertDrop, listForRecipient, countInbox, findForRecipient, setRead, deleteForRecipient };
}

export type DropRepository = ReturnType<typeof createDropRepository>;
