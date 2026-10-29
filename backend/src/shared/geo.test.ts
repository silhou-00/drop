// Tests for location rounding: same cell gives the same centre and key, the centre is
// close to every point in its cell, and edge latitudes and longitudes stay in range.
import { describe, expect, it } from "vitest";
import { snapToGrid } from "./geo.js";

function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
    const rad = Math.PI / 180;
    const a =
        Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;

    return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

describe("snapToGrid", () => {
    it("gives the same centre and key for two points in one cell", () => {
        const a = snapToGrid(14.60001, 121.00001);
        const b = snapToGrid(14.60003, 121.00004);

        expect(b).toEqual(a);
    });

    it("keeps the point within 107 m of the centre at several latitudes", () => {
        for (const lat of [0.0003, 14.6, 60.1, -33.9]) {
            for (const lng of [0.0003, 121.0437, -73.9857]) {
                const cell = snapToGrid(lat, lng);

                expect(distanceM(lat, lng, cell.lat, cell.lng)).toBeLessThan(107);
            }
        }
    });

    it("handles negative coordinates", () => {
        const cell = snapToGrid(-33.8688, -151.2093);

        expect(cell.lat).toBeLessThan(0);
        expect(cell.lng).toBeLessThan(0);
        expect(cell.key.startsWith("-")).toBe(true);
    });

    it("stays inside the longitude range near the date line", () => {
        for (const lng of [180, -180, 179.9999, -179.9999]) {
            const cell = snapToGrid(10, lng);

            expect(cell.lng).toBeGreaterThanOrEqual(-180);
            expect(cell.lng).toBeLessThanOrEqual(180);
        }
    });

    it("rounds to 6 decimals", () => {
        const cell = snapToGrid(14.6, 121.0437);

        expect(cell.lat).toBe(Math.round(cell.lat * 1e6) / 1e6);
        expect(cell.lng).toBe(Math.round(cell.lng * 1e6) / 1e6);
    });
});
