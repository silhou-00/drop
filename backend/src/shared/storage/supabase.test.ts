// Tests for the Supabase store with a fake fetch: request shape, bytes back, the
// missing-file signal, removal of a missing file, key refusal, and errors that never
// leak the secret key.
import { describe, expect, it } from "vitest";
import { createSupabaseStore } from "./supabase.js";

const KEY = "123e4567-e89b-42d3-a456-426614174000.webp";
const FAKE_KEY = "fake-key-for-tests";
const URL_BASE = "https://abc.supabase.co";

type Call = { url: string; init: RequestInit };

function setup(status: number, body: string) {
    const calls: Call[] = [];
    const fake = (async (url: string, init: RequestInit) => {
        calls.push({ url, init });

        return new Response(body, { status });
    }) as unknown as typeof fetch;
    const store = createSupabaseStore({ url: URL_BASE, secretKey: FAKE_KEY, bucket: "photos", fetch: fake });

    return { calls, store };
}

describe("supabase store", () => {
    it("saves with the right url, method, headers and body", async () => {
        const { calls, store } = setup(200, "{}");

        await store.save(KEY, Buffer.from("photo"));

        expect(calls).toHaveLength(1);
        expect(calls[0]?.url).toBe(`${URL_BASE}/storage/v1/object/photos/${KEY}`);
        expect(calls[0]?.init.method).toBe("POST");
        expect(calls[0]?.init.headers).toEqual({
            apikey: FAKE_KEY,
            Authorization: `Bearer ${FAKE_KEY}`,
            "Content-Type": "image/webp",
            "x-upsert": "false",
        });
        expect(Buffer.from(calls[0]?.init.body as Uint8Array).toString()).toBe("photo");
        expect(calls[0]?.init.signal).toBeInstanceOf(AbortSignal);
    });

    it("reads the bytes", async () => {
        const { calls, store } = setup(200, "photo");

        expect((await store.read(KEY)).toString()).toBe("photo");
        expect(calls[0]?.init.method).toBe("GET");
        expect(calls[0]?.init.headers).toEqual({ apikey: FAKE_KEY, Authorization: `Bearer ${FAKE_KEY}` });
    });

    it("signals a missing file like the local disk store", async () => {
        const body = JSON.stringify({ statusCode: "404", error: "not_found", message: "Object not found" });

        for (const status of [400, 404]) {
            const { store } = setup(status, body);

            await expect(store.read(KEY)).rejects.toMatchObject({ code: "ENOENT" });
        }
    });

    it("treats another 400 on read as a failure", async () => {
        const { store } = setup(400, "bad request");

        await expect(store.read(KEY)).rejects.not.toMatchObject({ code: "ENOENT" });
    });

    it("removes with DELETE and ignores a missing file", async () => {
        const first = setup(200, "{}");

        await expect(first.store.remove(KEY)).resolves.toBeUndefined();
        expect(first.calls[0]?.init.method).toBe("DELETE");

        const second = setup(404, JSON.stringify({ error: "not_found" }));

        await expect(second.store.remove(KEY)).resolves.toBeUndefined();
    });

    it("rejects a bad key before any fetch", async () => {
        const { calls, store } = setup(200, "{}");

        await expect(store.save("../x.webp", Buffer.from("x"))).rejects.toThrow("Invalid file key");
        await expect(store.read("photo.webp")).rejects.toThrow("Invalid file key");
        await expect(store.remove(`${KEY}.png`)).rejects.toThrow("Invalid file key");
        expect(calls).toHaveLength(0);
    });

    it("throws a status-only error without leaking the key", async () => {
        const { store } = setup(500, `secret ${FAKE_KEY} ${KEY}`);

        for (const run of [() => store.save(KEY, Buffer.from("x")), () => store.read(KEY), () => store.remove(KEY)]) {
            const error = (await run().catch((caught: unknown) => caught)) as Error;

            expect(error.message).toBe("Storage request failed with status 500");
            expect(error.message).not.toContain(FAKE_KEY);
            expect(error.message).not.toContain(KEY);
        }
    });
});
