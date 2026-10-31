// Tests for the account service against a fake repository and a fake store: a missing
// profile is a 404, a wrong name is a 422, every photo key is removed, and a store that
// fails still lets the deletion succeed with only a count logged.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FileStore } from "../shared/storage/model.js";
import { CONFIRM_MESSAGE } from "./model.js";
import type { AccountRepository, DeleteAccountResult } from "./repository.js";
import { createAccountService } from "./service.js";

function build(result: DeleteAccountResult, remove: FileStore["remove"] = async () => {}) {
    const removed: string[] = [];
    const store: FileStore = {
        save: async () => {},
        read: async () => Buffer.alloc(0),
        remove: async (key) => {
            removed.push(key);

            return remove(key);
        },
    };
    const accounts = { deleteAccount: async () => result } as AccountRepository;

    return { service: createAccountService({ accounts, store }), removed };
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("deleteAccount", () => {
    it("answers 404 when the user has no profile", async () => {
        const { service } = build({ status: "missing" });

        await expect(service.deleteAccount("u1", { username: "maya" })).rejects.toMatchObject({
            status: 404,
            code: "NOT_FOUND",
        });
    });

    it("answers 422 with the confirm message when the name differs", async () => {
        const { service, removed } = build({ status: "mismatch" });

        await expect(service.deleteAccount("u1", { username: "nope" })).rejects.toMatchObject({
            status: 422,
            code: "VALIDATION_ERROR",
            message: CONFIRM_MESSAGE,
        });
        expect(removed).toEqual([]);
    });

    it("removes every photo key after the deletion", async () => {
        const keys = Array.from({ length: 23 }, (_, index) => `k${index}.webp`);
        const { service, removed } = build({ status: "deleted", photoKeys: keys });

        await service.deleteAccount("u1", { username: "maya" });

        expect(removed.sort()).toEqual([...keys].sort());
    });

    it("still resolves when a file cannot be removed, and logs only the count", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const { service } = build({ status: "deleted", photoKeys: ["secret-a.webp", "secret-b.webp"] }, async (key) => {
            if (key === "secret-a.webp") {
                throw new Error("disk failure for secret-a.webp");
            }
        });

        await expect(service.deleteAccount("u1", { username: "maya" })).resolves.toBeUndefined();

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0]).toEqual(["Photo files could not be removed:", 1]);
        expect(JSON.stringify(spy.mock.calls)).not.toContain("secret");
    });
});
