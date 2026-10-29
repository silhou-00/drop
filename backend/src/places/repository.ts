// Data access for the place-name cache. A row counts as fresh for 48 hours after it was
// fetched. Expired rows are removed by the service on a cache miss.
import { eq, and, gt, lte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { placeNames } from "./model.js";

const WINDOW = sql`interval '48 hours'`;

export function createPlaceRepository(db: NodePgDatabase) {
    // a fresh row, whose name may be null when LocationIQ had none
    async function findFresh(cellKey: string): Promise<{ name: string | null } | null> {
        const rows = await db
            .select({ name: placeNames.name })
            .from(placeNames)
            .where(and(eq(placeNames.cellKey, cellKey), gt(placeNames.fetchedAt, sql`now() - ${WINDOW}`)))
            .limit(1);

        return rows[0] ?? null;
    }

    async function upsert(cellKey: string, name: string | null): Promise<void> {
        await db
            .insert(placeNames)
            .values({ cellKey, name })
            .onConflictDoUpdate({ target: placeNames.cellKey, set: { name, fetchedAt: sql`now()` } });
    }

    async function deleteExpired(): Promise<void> {
        await db.delete(placeNames).where(lte(placeNames.fetchedAt, sql`now() - ${WINDOW}`));
    }

    return { findFresh, upsert, deleteExpired };
}

export type PlaceRepository = ReturnType<typeof createPlaceRepository>;
