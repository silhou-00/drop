// Data access for statements. Starting and ending lock the owner's profile row first,
// so two writes for one owner run one after the other and the single-open-statement
// index is never the thing that decides. Every query filters by profile, so a
// statement that belongs to someone else is never matched. The view carries the
// running flag, the seconds left and the drop count, all worked out in SQL.
import { and, count, desc, eq, getTableColumns, inArray, isNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drops } from "../drops/model.js";
import { profiles } from "../profiles/model.js";
import { STATEMENT_DURATION_SECONDS, runningSql, secondsLeftSql, statements, type StatementView } from "./model.js";

export type EndResult = { status: "ended"; view: StatementView } | { status: "not-running" } | { status: "missing" };

type Executor = Pick<NodePgDatabase, "select">;

const viewColumns = {
    ...getTableColumns(statements),
    running: runningSql(statements),
    secondsLeft: secondsLeftSql(statements),
    dropCount: count(drops.id),
};

export function createStatementRepository(db: NodePgDatabase) {
    // statements with their drop counts, one row each
    function selectViews(executor: Executor) {
        return executor
            .select(viewColumns)
            .from(statements)
            .leftJoin(drops, eq(drops.statementId, statements.id))
            .groupBy(statements.id);
    }

    async function lockProfile(tx: Executor, profileId: string) {
        await tx.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, profileId)).for("update");
    }

    // closes the open row at its true end, then opens the new one
    async function start(profileId: string, text: string): Promise<StatementView> {
        return db.transaction(async (tx) => {
            await lockProfile(tx, profileId);
            await tx
                .update(statements)
                .set({ endedAt: sql`greatest(${statements.startedAt}, least(now(), ${statements.endsAt}))` })
                .where(and(eq(statements.profileId, profileId), isNull(statements.endedAt)));

            const inserted = await tx
                .insert(statements)
                .values({
                    profileId,
                    text,
                    endsAt: sql`now() + make_interval(secs => ${STATEMENT_DURATION_SECONDS})`,
                })
                .returning({ id: statements.id });
            const rows = await selectViews(tx).where(eq(statements.id, inserted[0].id));

            return rows[0];
        });
    }

    async function end(profileId: string, id: string): Promise<EndResult> {
        return db.transaction(async (tx) => {
            await lockProfile(tx, profileId);

            const updated = await tx
                .update(statements)
                .set({ endedAt: sql`greatest(${statements.startedAt}, now())` })
                .where(and(eq(statements.id, id), eq(statements.profileId, profileId), runningSql(statements)))
                .returning({ id: statements.id });

            if (updated.length === 0) {
                const found = await tx
                    .select({ id: statements.id })
                    .from(statements)
                    .where(and(eq(statements.id, id), eq(statements.profileId, profileId)))
                    .limit(1);

                return { status: found.length === 0 ? "missing" : "not-running" };
            }

            const rows = await selectViews(tx).where(eq(statements.id, id));

            return { status: "ended", view: rows[0] };
        });
    }

    async function findRunning(profileId: string): Promise<StatementView | null> {
        const rows = await selectViews(db).where(and(eq(statements.profileId, profileId), runningSql(statements)));

        return rows[0] ?? null;
    }

    async function findRunningId(profileId: string): Promise<string | null> {
        const rows = await db
            .select({ id: statements.id })
            .from(statements)
            .where(and(eq(statements.profileId, profileId), runningSql(statements)))
            .limit(1);

        return rows[0]?.id ?? null;
    }

    // a foreign id never matches, because the profile filter comes first
    async function summariesFor(profileId: string, ids: string[]): Promise<StatementView[]> {
        if (ids.length === 0) {
            return [];
        }

        return selectViews(db)
            .where(and(eq(statements.profileId, profileId), inArray(statements.id, ids)))
            .orderBy(desc(statements.startedAt), desc(statements.id));
    }

    return { start, end, findRunning, findRunningId, summariesFor };
}

export type StatementRepository = ReturnType<typeof createStatementRepository>;
