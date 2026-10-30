// Local disk file store. Keeps files in one folder, named by a random key. A key must
// be a UUID plus .webp, and the resolved path must stay inside the folder, so a key can
// never reach another path. Nothing serves this folder; a route that checks the owner
// reads files through the store.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { FileStore } from "./model.js";

type Options = {
    dir: string;
};

const KEY_PATTERN = /^[a-z0-9-]{36}\.webp$/;

export function createLocalDiskStore({ dir }: Options): FileStore {
    const root = path.resolve(dir);

    // key check and path containment
    function pathFor(key: string): string {
        if (!KEY_PATTERN.test(key)) {
            throw new Error("Invalid file key");
        }

        const target = path.resolve(root, key);

        if (path.dirname(target) !== root) {
            throw new Error("Invalid file key");
        }

        return target;
    }

    // write to a temp name, then rename, so a file appears whole or not at all
    async function save(key: string, bytes: Buffer): Promise<void> {
        const target = pathFor(key);
        const temp = path.join(root, `${randomUUID()}.tmp`);

        await mkdir(root, { recursive: true });

        try {
            await writeFile(temp, bytes);
            await rename(temp, target);
        } catch (error) {
            await rm(temp, { force: true });

            throw error;
        }
    }

    async function read(key: string): Promise<Buffer> {
        return readFile(pathFor(key));
    }

    async function remove(key: string): Promise<void> {
        await rm(pathFor(key), { force: true });
    }

    return { save, read, remove };
}
