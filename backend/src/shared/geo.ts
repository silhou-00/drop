// Location rounding. Snaps a point to the centre of a grid cell about 150 m wide, so the
// server never stores or shows an exact position. The cell key also names the place-name cache row.
const METRES_PER_DEGREE = 111_320;
const DEFAULT_CELL_M = 150;
const MAX_LAT_FOR_STEP = 85;
const DECIMALS = 1_000_000;

export type SnappedPoint = {
    lat: number;
    lng: number;
    key: string;
};

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

function round6(value: number) {
    return Math.round(value * DECIMALS) / DECIMALS;
}

export function snapToGrid(lat: number, lng: number, sizeM = DEFAULT_CELL_M): SnappedPoint {
    const latStep = sizeM / METRES_PER_DEGREE;
    const i = Math.floor(lat / latStep);
    const centreLat = (i + 0.5) * latStep;
    const lngStep =
        sizeM / (METRES_PER_DEGREE * Math.cos((clamp(centreLat, -MAX_LAT_FOR_STEP, MAX_LAT_FOR_STEP) * Math.PI) / 180));
    const j = Math.floor(lng / lngStep);
    const centreLng = clamp((j + 0.5) * lngStep, -180, 180);

    return { lat: round6(centreLat), lng: round6(centreLng), key: `${i}:${j}` };
}
