// The soft area drawn around a drop's place. The server stores a point rounded to a cell of
// about 150 m, so the map shows a ring of that radius around it rather than an exact pin.
const AREA_RADIUS_M = 150;
const AREA_STEPS = 64;
const METRES_PER_DEGREE = 111320;

// a ring of points about 150 m around the centre, as a GeoJSON polygon
export function areaAround(latitude: number, longitude: number) {
    const latStep = AREA_RADIUS_M / METRES_PER_DEGREE;
    const lngStep = AREA_RADIUS_M / (METRES_PER_DEGREE * Math.cos((latitude * Math.PI) / 180));
    const ring: [number, number][] = [];

    for (let index = 0; index <= AREA_STEPS; index += 1) {
        const angle = (index / AREA_STEPS) * Math.PI * 2;

        ring.push([longitude + lngStep * Math.cos(angle), latitude + latStep * Math.sin(angle)]);
    }

    return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [ring] } };
}
