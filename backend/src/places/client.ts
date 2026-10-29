// LocationIQ client. Turns a point into a place name through reverse geocoding. The API
// key travels in the query string, so URLs are never logged, only a status code.
import { locationIqSchema, pickPlaceName } from "./model.js";

type Options = {
    apiKey: string;
    fetch?: typeof globalThis.fetch;
};

export type ReverseResult = string | null | "error";

const ENDPOINT = "https://us1.locationiq.com/v1/reverse";
const TIMEOUT_MS = 2500;
const NOT_FOUND = 404;

export function createLocationIqClient({ apiKey, fetch = globalThis.fetch }: Options) {
    // null means LocationIQ has no name here; "error" means the lookup failed
    async function reverse(lat: number, lng: number): Promise<ReverseResult> {
        const params = new URLSearchParams({
            key: apiKey,
            lat: String(lat),
            lon: String(lng),
            format: "json",
            normalizeaddress: "1",
            "accept-language": "en",
        });

        try {
            const response = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });

            if (response.status === NOT_FOUND) {
                return null;
            }

            if (!response.ok) {
                console.error("LocationIQ lookup failed:", response.status);

                return "error";
            }

            const parsed = locationIqSchema.safeParse(await response.json());

            return parsed.success ? pickPlaceName(parsed.data.address) : "error";
        } catch (error) {
            console.error("LocationIQ lookup failed:", error instanceof Error ? error.name : "unknown");

            return "error";
        }
    }

    return { reverse };
}

export type LocationIqClient = ReturnType<typeof createLocationIqClient>;
