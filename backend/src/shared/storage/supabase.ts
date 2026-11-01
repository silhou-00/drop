// Supabase Storage file store. Saves, reads and removes files in one private bucket
// through the Storage REST API, authenticated with the server-only secret key. A missing
// file on read throws an error with code ENOENT, the same signal the local disk store
// gives, so callers treat both alike. Errors carry the HTTP status only.
import { assertValidKey } from "./key.js";
import type { FileStore } from "./model.js";

type Options = {
    url: string;
    secretKey: string;
    bucket: string;
    fetch?: typeof globalThis.fetch;
};

const TIMEOUT_MS = 10_000;

export function createSupabaseStore({ url, secretKey, bucket, fetch = globalThis.fetch }: Options): FileStore {
    const base = `${url.replace(/\/+$/, "")}/storage/v1/object/${bucket}`;
    const auth = { apikey: secretKey, Authorization: `Bearer ${secretKey}` };

    // the status-only error for any failed call
    function failure(status: number): Error {
        return new Error(`Storage request failed with status ${status}`);
    }

    // Supabase answers a missing object with 400 or 404 and not_found in the body
    async function isMissing(response: Response): Promise<boolean> {
        if (response.status === 404) {
            return true;
        }

        if (response.status !== 400) {
            return false;
        }

        const text = await response.text().catch(() => "");

        return text.includes("not_found") || text.includes("Object not found");
    }

    async function save(key: string, bytes: Buffer): Promise<void> {
        assertValidKey(key);

        const response = await fetch(`${base}/${key}`, {
            method: "POST",
            headers: { ...auth, "Content-Type": "image/webp", "x-upsert": "false" },
            body: new Uint8Array(bytes),
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!response.ok) {
            throw failure(response.status);
        }
    }

    async function read(key: string): Promise<Buffer> {
        assertValidKey(key);

        const response = await fetch(`${base}/${key}`, {
            method: "GET",
            headers: auth,
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!response.ok) {
            if (await isMissing(response)) {
                throw Object.assign(new Error("File not found"), { code: "ENOENT" });
            }

            throw failure(response.status);
        }

        return Buffer.from(await response.arrayBuffer());
    }

    async function remove(key: string): Promise<void> {
        assertValidKey(key);

        const response = await fetch(`${base}/${key}`, {
            method: "DELETE",
            headers: auth,
            signal: AbortSignal.timeout(TIMEOUT_MS),
        });

        if (!response.ok && !(await isMissing(response))) {
            throw failure(response.status);
        }
    }

    return { save, read, remove };
}
