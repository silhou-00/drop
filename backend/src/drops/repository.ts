// Data access for drops. One write: insert a drop inside a transaction that locks the
// recipient's profile row, so a pause that lands first is seen and the insert is refused.
import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { profiles } from "../profiles/model.js";
import type { LngLat } from "../shared/db/geography.js";
import { drops } from "./model.js";

export type NewDropRow = {
    recipientId: string;
    message: string;
    location: LngLat | null;
    locationSource: "gps" | "manual" | null;
    locationName: string | null;
    senderKey: string;
    deviceKey: string;
};

export type InsertDropResult = "inserted" | "paused" | "missing";

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

    return { insertDrop };
}

export type DropRepository = ReturnType<typeof createDropRepository>;
