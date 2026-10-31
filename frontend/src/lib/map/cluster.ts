// Merging nearby places into one pin when the map is zoomed out. From street zoom (14) up,
// every place keeps its own pin. Below it, places fall into square cells about 48 screen
// pixels wide at the current zoom, and each cell becomes one pin at the drop-weighted centre
// of its places. Pure arithmetic: no map library is loaded here.
import type { PlaceGroup } from "@/lib/drops/helper";

export type PlaceCluster = {
    key: string;
    lat: number;
    lng: number;
    count: number;
    unread: number;
    places: PlaceGroup[];
};

const CLUSTER_CELL_PX = 48;
const SPLIT_ZOOM = 14;
const TILE_PX = 256;

function single(group: PlaceGroup): PlaceCluster {
    return {
        key: group.key,
        lat: group.lat,
        lng: group.lng,
        count: group.items.length,
        unread: group.unread,
        places: [group],
    };
}

// pins for the given zoom, in the order their first place appears
export function clusterPlaces(groups: PlaceGroup[], zoom: number): PlaceCluster[] {
    if (zoom >= SPLIT_ZOOM) {
        return groups.map(single);
    }

    const cell = CLUSTER_CELL_PX / ((TILE_PX * Math.pow(2, zoom)) / 360);
    const cells = new Map<string, PlaceGroup[]>();

    for (const group of groups) {
        const i = Math.floor(group.lng / cell);
        const j = Math.floor(group.lat / cell);
        const key = `c:${zoom}:${i}:${j}`;
        const kept = cells.get(key);

        if (kept) {
            kept.push(group);
        } else {
            cells.set(key, [group]);
        }
    }

    return [...cells.entries()].map(([key, places]) => {
        if (places.length === 1) {
            return single(places[0]);
        }

        let count = 0;
        let unread = 0;
        let lat = 0;
        let lng = 0;

        for (const place of places) {
            const weight = place.items.length;

            count += weight;
            unread += place.unread;
            lat += place.lat * weight;
            lng += place.lng * weight;
        }

        return { key, lat: lat / count, lng: lng / count, count, unread, places };
    });
}
