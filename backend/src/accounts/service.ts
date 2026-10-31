// Business rules for deleting an account. The repository removes every row in one
// transaction; the photo files are removed after the commit, in small batches. A file
// that cannot be removed does not undo the deletion, because no row points to it any
// more. Only the number of failures is logged, never a key, email or name.
import { AppError } from "../shared/errors.js";
import type { FileStore } from "../shared/storage/model.js";
import { CONFIRM_MESSAGE, type DeleteAccountInput } from "./model.js";
import type { AccountRepository } from "./repository.js";

type Dependencies = {
    accounts: AccountRepository;
    store: FileStore;
};

const REMOVE_BATCH = 10;

export function createAccountService({ accounts, store }: Dependencies) {
    async function deleteAccount(userId: string, input: DeleteAccountInput): Promise<void> {
        const result = await accounts.deleteAccount(userId, input.username);

        if (result.status === "missing") {
            throw new AppError(404, "NOT_FOUND", "Not found");
        }

        if (result.status === "mismatch") {
            throw new AppError(422, "VALIDATION_ERROR", CONFIRM_MESSAGE);
        }

        // files, after the commit
        let failed = 0;

        for (let start = 0; start < result.photoKeys.length; start += REMOVE_BATCH) {
            const batch = result.photoKeys.slice(start, start + REMOVE_BATCH);
            const settled = await Promise.allSettled(batch.map((key) => store.remove(key)));

            failed += settled.filter((entry) => entry.status === "rejected").length;
        }

        if (failed > 0) {
            console.error("Photo files could not be removed:", failed);
        }
    }

    return { deleteAccount };
}

export type AccountService = ReturnType<typeof createAccountService>;
