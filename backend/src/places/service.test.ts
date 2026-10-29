// Tests for the place-name service with fakes: cache hit, miss and store, a cached null,
// a failed lookup that is not cached, and cleanup of expired rows on a miss.
import { describe, expect, it } from "vitest";
import type { LocationIqClient, ReverseResult } from "./client.js";
import type { PlaceRepository } from "./repository.js";
import { createPlaceService } from "./service.js";

const cell = { lat: 14.6, lng: 121.04, key: "1:2" };

function build(cache: Map<string, string | null>, result: ReverseResult) {
    const events: string[] = [];
    const repo: PlaceRepository = {
        findFresh: async (key) => (cache.has(key) ? { name: cache.get(key) ?? null } : null),
        upsert: async (key, name) => {
            events.push("upsert");
            cache.set(key, name);
        },
        deleteExpired: async () => {
            events.push("deleteExpired");
        },
    };
    const client: LocationIqClient = {
        reverse: async () => {
            events.push("reverse");

            return result;
        },
    };

    return { service: createPlaceService({ repo, client }), events };
}

describe("lookupPlaceName", () => {
    it("returns a fresh cached name without calling LocationIQ", async () => {
        const { service, events } = build(new Map([["1:2", "Diliman"]]), "other");

        expect(await service.lookupPlaceName(cell)).toBe("Diliman");
        expect(events).toEqual([]);
    });

    it("returns a cached null without calling LocationIQ", async () => {
        const { service, events } = build(new Map([["1:2", null]]), "other");

        expect(await service.lookupPlaceName(cell)).toBeNull();
        expect(events).toEqual([]);
    });

    it("calls LocationIQ on a miss, caches the answer, then deletes expired rows", async () => {
        const cache = new Map<string, string | null>();
        const { service, events } = build(cache, "Diliman, Quezon City");

        expect(await service.lookupPlaceName(cell)).toBe("Diliman, Quezon City");
        expect(cache.get("1:2")).toBe("Diliman, Quezon City");
        expect(events).toEqual(["reverse", "upsert", "deleteExpired"]);
    });

    it("caches a null when LocationIQ has no name", async () => {
        const cache = new Map<string, string | null>();
        const { service } = build(cache, null);

        expect(await service.lookupPlaceName(cell)).toBeNull();
        expect(cache.has("1:2")).toBe(true);
    });

    it("returns null and caches nothing when the lookup fails", async () => {
        const cache = new Map<string, string | null>();
        const { service } = build(cache, "error");

        expect(await service.lookupPlaceName(cell)).toBeNull();
        expect(cache.size).toBe(0);
    });
});
