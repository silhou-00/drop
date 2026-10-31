// Profile database access. Queries only, no business rules. An insert reports which
// unique constraint it hit, so the service can answer with the right conflict. The
// insert also prunes expired username holds and refuses a name that is still held,
// reporting it as a username conflict.
import { eq, lte, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { profiles, usernameHolds, type Profile } from "./model.js";

export type InsertProfile = {
    userId: string;
    username: string;
    displayName: string;
};

export type InsertResult = { profile: Profile } | { conflict: "username" | "user" };

export type ProfileChanges = Partial<Pick<Profile, "displayName" | "heatmapEnabled" | "notifyEmail">>;

const UNIQUE_VIOLATION = "23505";
const USER_ID_CONSTRAINT = "profiles_user_id_unique";
const USERNAME_CONSTRAINT = "profiles_username_unique";

type PgError = { code?: string; constraint?: string; cause?: unknown };

// find the constraint name on the error or on its wrapped cause
function uniqueConstraint(error: unknown): string | null {
    let current = error as PgError | undefined;

    while (current) {
        if (current.code === UNIQUE_VIOLATION) {
            return current.constraint ?? null;
        }

        current = current.cause as PgError | undefined;
    }

    return null;
}

export function createProfileRepository(db: NodePgDatabase) {
    async function findByUsername(username: string): Promise<Profile | null> {
        const rows = await db.select().from(profiles).where(eq(profiles.username, username)).limit(1);

        return rows[0] ?? null;
    }

    async function findByUserId(userId: string): Promise<Profile | null> {
        const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);

        return rows[0] ?? null;
    }

    async function insertProfile(input: InsertProfile): Promise<InsertResult> {
        try {
            return await db.transaction(async (tx): Promise<InsertResult> => {
                // expired holds
                await tx.delete(usernameHolds).where(lte(usernameHolds.releasedAt, sql`now()`));

                const held = await tx
                    .select({ username: usernameHolds.username })
                    .from(usernameHolds)
                    .where(eq(usernameHolds.username, input.username))
                    .limit(1);

                if (held.length > 0) {
                    return { conflict: "username" };
                }

                const rows = await tx.insert(profiles).values(input).returning();

                return { profile: rows[0] };
            });
        } catch (error) {
            const constraint = uniqueConstraint(error);

            if (constraint === USERNAME_CONSTRAINT) {
                return { conflict: "username" };
            }

            if (constraint === USER_ID_CONSTRAINT) {
                return { conflict: "user" };
            }

            throw error;
        }
    }

    async function updateByUserId(userId: string, changes: ProfileChanges): Promise<Profile | null> {
        const rows = await db.update(profiles).set(changes).where(eq(profiles.userId, userId)).returning();

        return rows[0] ?? null;
    }

    return { findByUsername, findByUserId, insertProfile, updateByUserId };
}

export type ProfileRepository = ReturnType<typeof createProfileRepository>;
