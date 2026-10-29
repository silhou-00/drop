// Tests for place-name picking: the preference order, the city suffix, and that a road
// or house number never appears.
import { describe, expect, it } from "vitest";
import { locationIqSchema, pickPlaceName } from "./model.js";

describe("pickPlaceName", () => {
    it("prefers name, then neighbourhood, then suburb, joined with the city", () => {
        expect(pickPlaceName({ name: "Diliman", neighbourhood: "N", suburb: "S", city: "Quezon City" })).toBe(
            "Diliman, Quezon City",
        );
        expect(pickPlaceName({ neighbourhood: "N", suburb: "S", city: "Quezon City" })).toBe("N, Quezon City");
        expect(pickPlaceName({ suburb: "S", city: "Quezon City" })).toBe("S, Quezon City");
    });

    it("falls back to the city alone, and to null with nothing usable", () => {
        expect(pickPlaceName({ city: "Quezon City" })).toBe("Quezon City");
        expect(pickPlaceName({})).toBeNull();
        expect(pickPlaceName(undefined)).toBeNull();
    });

    it("never uses a road or house number", () => {
        const parsed = locationIqSchema.parse({
            address: { road: "Rizal St", house_number: "12", city: "Quezon City" },
        });

        expect(pickPlaceName(parsed.address)).toBe("Quezon City");
    });

    it("does not repeat a name that equals the city", () => {
        expect(pickPlaceName({ name: "Manila", city: "Manila" })).toBe("Manila");
    });

    it("cuts to 100 characters", () => {
        expect(pickPlaceName({ name: "a".repeat(150) })?.length).toBe(100);
    });
});
