// Health service. Answers whether the database can be reached by running a trivial
// query. The database handle is passed in so tests can supply a stand-in.
import { sql, type SQL } from "drizzle-orm";

export type DbLike = {
    execute: (query: SQL) => Promise<unknown>;
};

export function createHealthService(dbLike: DbLike) {
    // database check
    async function checkDatabase(): Promise<boolean> {
        try {
            await dbLike.execute(sql`select 1`);

            return true;
        } catch (error) {
            console.error("Database check failed:", (error as NodeJS.ErrnoException).code ?? "UNKNOWN");

            return false;
        }
    }

    return { checkDatabase };
}
