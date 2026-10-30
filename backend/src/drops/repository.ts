// Data access for drops. Insert a drop inside a transaction that locks the recipient's
// profile row, so a pause that lands first is seen and the insert is refused. The inbox
// queries list (optionally only unread or only with a photo), count the unread, read,
// mark and delete a drop; each one filters by recipient and id so a drop that belongs to
// someone else is never matched.
import { and, count, desc, eq, getTableColumns, isNotNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { profiles } from "../profiles/model.js";
import type { LngLat } from "../shared/db/geography.js";
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

export type InsertDropResult = "inserted" | "paused" | "missing";

// a listed row carries its time at microsecond precision, for the page cursor
export type ListedDropRow = DropRow & { cursorAt: string };

const CURSOR_AT_SQL = sql<string>`to_char(${drops.createdAt} at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export function createDropRepository(db: NodePgDatabase) {
    async function insertDrop(row: NewDropRow): Promise<InsertDropResult> {
        return db.transaction(async (tx) => {
            const rows = await tx
                .select({ acceptingDrops: profiles.acceptingDrops })
                .from(profiles)
                .where(eq(profiles.id, row.recipientId))
                .for("share");

            if (rows.length === 0) {
                return "missing";
            }

            if (!rows[0].acceptingDrops) {
                return "paused";
            }

            await tx.insert(drops).values(row);

            return "inserted";
        });
    }

    // newest first; one extra row tells the caller whether another page follows
    async function listForRecipient(
        profileId: string,
        limit: number,
        cursor: InboxCursor | undefined,
        filter: InboxFilter,
    ): Promise<ListedDropRow[]> {
        const after = cursor
            ? sql`(${drops.createdAt}, ${drops.id}) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`
            : undefined;
        const narrow =
            filter === "unread" ? eq(drops.isRead, false) : filter === "photos" ? isNotNull(drops.photoKey) : undefined;

        return db
            .select({ ...getTableColumns(drops), cursorAt: CURSOR_AT_SQL })
            .from(drops)
            .where(and(eq(drops.recipientId, profileId), narrow, after))
            .orderBy(desc(drops.createdAt), desc(drops.id))
            .limit(limit + 1);
    }

    // every unread drop of the recipient, whatever the list filter
    async function countUnread(profileId: string): Promise<number> {
        const rows = await db
            .select({ total: count() })
            .from(drops)
            .where(and(eq(drops.recipientId, profileId), eq(drops.isRead, false)));

        return rows[0]?.total ?? 0;
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

    return { insertDrop, listForRecipient, countUnread, findForRecipient, setRead, deleteForRecipient };
}

export type DropRepository = ReturnType<typeof createDropRepository>;
