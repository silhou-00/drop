// Drizzle column type for PostGIS geography(Point, 4326). Writes build the point with
// ST_MakePoint; reads parse the EWKB hex the driver returns. The postgis extension is enabled by migration 0000.
import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

export type LngLat = {
    lng: number;
    lat: number;
};

const SRID_FLAG = 0x20000000;
const POINT_TYPE = 1;
const HEADER_BYTES = 1 + 4;
const SRID_BYTES = 4;

// parse an EWKB hex point (byte order, type with SRID flag, SRID, x, y)
export function parseEwkbPoint(hex: string): LngLat {
    const buffer = Buffer.from(hex, "hex");
    const little = buffer.readUInt8(0) === 1;
    const type = little ? buffer.readUInt32LE(1) : buffer.readUInt32BE(1);
    const hasSrid = (type & SRID_FLAG) !== 0;

    if ((type & 0xff) !== POINT_TYPE) {
        throw new Error("Not a point");
    }

    const offset = HEADER_BYTES + (hasSrid ? SRID_BYTES : 0);

    return {
        lng: little ? buffer.readDoubleLE(offset) : buffer.readDoubleBE(offset),
        lat: little ? buffer.readDoubleLE(offset + 8) : buffer.readDoubleBE(offset + 8),
    };
}

export const geographyPoint = customType<{ data: LngLat; driverData: string }>({
    dataType() {
        return "geography(Point,4326)";
    },
    toDriver({ lng, lat }) {
        return sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography` as unknown as string;
    },
    fromDriver(value) {
        return parseEwkbPoint(value);
    },
});
