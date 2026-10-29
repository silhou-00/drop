// Tests for the LocationIQ client with a fake fetch: request parameters, a name, a 404,
// server failures and a timeout.
import { describe, expect, it, vi } from "vitest";
import { createLocationIqClient } from "./client.js";

function fakeFetch(respond: () => Promise<Response>) {
    const calls: string[] = [];
    const fetch = (async (url: string) => {
        calls.push(url);

        return respond();
    }) as unknown as typeof globalThis.fetch;

    return { fetch, calls };
}

describe("createLocationIqClient", () => {
    it("sends the documented parameters and returns the picked name", async () => {
        const { fetch, calls } = fakeFetch(async () =>
            Response.json({ address: { suburb: "Diliman", city: "Quezon City", road: "Rizal St" } }),
        );
        const result = await createLocationIqClient({ apiKey: "pk.test", fetch }).reverse(14.6, 121.04);
        const url = new URL(calls[0]);

        expect(result).toBe("Diliman, Quezon City");
        expect(url.origin + url.pathname).toBe("https://us1.locationiq.com/v1/reverse");
        expect(Object.fromEntries(url.searchParams)).toEqual({
            key: "pk.test",
            lat: "14.6",
            lon: "121.04",
            format: "json",
            normalizeaddress: "1",
            "accept-language": "en",
        });
    });

    it("returns null on a 404", async () => {
        const { fetch } = fakeFetch(async () => new Response("{}", { status: 404 }));

        expect(await createLocationIqClient({ apiKey: "pk.test", fetch }).reverse(0, 0)).toBeNull();
    });

    it("returns error on a 500 without logging the key", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const { fetch } = fakeFetch(async () => new Response("{}", { status: 500 }));

        expect(await createLocationIqClient({ apiKey: "pk.secret", fetch }).reverse(0, 0)).toBe("error");
        expect(JSON.stringify(spy.mock.calls)).not.toContain("pk.secret");

        spy.mockRestore();
    });

    it("returns error on a timeout or network failure", async () => {
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        const { fetch } = fakeFetch(async () => {
            throw new DOMException("timed out", "TimeoutError");
        });

        expect(await createLocationIqClient({ apiKey: "pk.test", fetch }).reverse(0, 0)).toBe("error");

        spy.mockRestore();
    });
});
