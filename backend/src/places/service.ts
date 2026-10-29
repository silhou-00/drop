// Place-name lookup. Answers from the 48-hour cache when it can, otherwise asks
// LocationIQ and caches the answer. Any failure gives no name and never blocks a drop.
import type { SnappedPoint } from "../shared/geo.js";
import type { LocationIqClient } from "./client.js";
import type { PlaceRepository } from "./repository.js";

type Dependencies = {
    repo: PlaceRepository;
    client: LocationIqClient;
};

export const PLACE_CACHE_HOURS = 48;

export function createPlaceService({ repo, client }: Dependencies) {
    async function lookupPlaceName(cell: SnappedPoint): Promise<string | null> {
        try {
            const cached = await repo.findFresh(cell.key);

            if (cached) {
                return cached.name;
            }

            const result = await client.reverse(cell.lat, cell.lng);

            if (result === "error") {
                return null;
            }

            await repo.upsert(cell.key, result);
            await repo.deleteExpired();

            return result;
        } catch (error) {
            console.error("Place lookup failed:", error instanceof Error ? error.name : "unknown");

            return null;
        }
    }

    return { lookupPlaceName };
}

export type PlaceService = ReturnType<typeof createPlaceService>;
