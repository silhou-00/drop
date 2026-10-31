// Account deletion in one transaction. The profile row is locked first, so a drop being
// sent at the same moment either commits before the lock (its photo key is read here) or
// finds the profile gone. The link name is held for 30 days, then the user row is deleted
// and the cascade removes sessions, the auth account, the profile, drops and statements.
import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { user } from "../auth/model.js";
import { drops } from "../drops/model.js";
import { profiles, usernameHolds, USERNAME_HOLD_DAYS } from "../profiles/model.js";

export type DeleteAccountResult =
    { status: "deleted"; photoKeys: string[] } | { status: "missing" } | { status: "mismatch" };

export function createAccountRepository(db: NodePgDatabase) {
    async function deleteAccount(userId: string, confirmUsername: string): Promise<DeleteAccountResult> {
        return db.transaction(async (tx): Promise<DeleteAccountResult> => {
            const owned = await tx
                .select({ id: profiles.id, username: profiles.username })
                .from(profiles)
                .where(eq(profiles.userId, userId))
                .for("update");

            if (owned.length === 0) {
                return { status: "missing" };
            }

            const profile = owned[0];

            if (profile.username.toLowerCase() !== confirmUsername.toLowerCase()) {
                return { status: "mismatch" };
            }

            const files = await tx
                .select({ photoKey: drops.photoKey })
                .from(drops)
                .where(and(eq(drops.recipientId, profile.id), isNotNull(drops.photoKey)));

            const releasedAt = sql`now() + make_interval(days => ${USERNAME_HOLD_DAYS})`;

            await tx
                .insert(usernameHolds)
                .values({ username: profile.username, releasedAt })
                .onConflictDoUpdate({ target: usernameHolds.username, set: { releasedAt } });

            await tx.delete(user).where(eq(user.id, userId));

            return { status: "deleted", photoKeys: files.map((file) => file.photoKey as string) };
        });
    }

    return { deleteAccount };
}

export type AccountRepository = ReturnType<typeof createAccountRepository>;
