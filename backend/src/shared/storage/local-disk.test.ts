// Tests for the local disk store against a temporary folder: save, read and remove,
// the key check, and refusal of keys that look like paths.
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLocalDiskStore } from "./local-disk.js";

const KEY = "123e4567-e89b-42d3-a456-426614174000.webp";

let root: string;
let dir: string;

beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), "drop-uploads-"));
    dir = path.join(root, "uploads");
});

afterAll(() => {
    rmSync(root, { recursive: true, force: true });
});

describe("local disk store", () => {
    it("creates the folder, saves, reads and removes", async () => {
        const store = createLocalDiskStore({ dir });

        await store.save(KEY, Buffer.from("photo"));

        expect((await store.read(KEY)).toString()).toBe("photo");
        expect(readdirSync(dir)).toEqual([KEY]);

        await store.remove(KEY);

        expect(readdirSync(dir)).toEqual([]);
        await expect(store.read(KEY)).rejects.toThrow();
    });

    it("ignores a missing file on remove", async () => {
        await expect(createLocalDiskStore({ dir }).remove(KEY)).resolves.toBeUndefined();
    });

    it("rejects keys that do not match the pattern", async () => {
        const store = createLocalDiskStore({ dir });
        const bad = ["photo.webp", `${KEY}.png`, KEY.toUpperCase(), `${KEY}\n`, "", KEY.replace(".webp", ".jpg")];

        for (const key of bad) {
            await expect(store.save(key, Buffer.from("x"))).rejects.toThrow("Invalid file key");
            await expect(store.read(key)).rejects.toThrow("Invalid file key");
            await expect(store.remove(key)).rejects.toThrow("Invalid file key");
        }
    });

    it("rejects keys that try to leave the folder", async () => {
        const store = createLocalDiskStore({ dir });
        const bad = [
            `../${KEY}`,
            `..\${KEY}`,
            `${"a".repeat(30)}/../x.webp`,
            `/etc/passwd`,
            `%2e%2e%2f${"a".repeat(28)}.webp`,
        ];

        for (const key of bad) {
            await expect(store.save(key, Buffer.from("x"))).rejects.toThrow("Invalid file key");
        }

        expect(readdirSync(root)).toEqual(["uploads"]);
    });
});
