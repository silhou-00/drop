// One-time MapLibre setup shared by every map in the app, and the limits they all use. Loading
// this file registers the bundled worker file and the pmtiles protocol, so the Philippines
// extract is read from the same origin. It is imported only from the lazily loaded map files,
// so MapLibre and its stylesheet load only on a page that shows a map.
import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { Protocol } from "pmtiles";

export const MAX_BOUNDS: [number, number, number, number] = [116.9, 4.6, 126.6, 21.1];
// the all-drops map may show past the extract, so a wide screen can frame every pin clear of
// the docked list; tighter limits force a zoom at which the spread cannot fit
export const WIDE_BOUNDS: [number, number, number, number] = [101, 0, 142, 26];
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 15;

// accent-fill from tokens.css; MapLibre paint takes colours, not CSS variables
export const AREA_COLOUR = "#FF3131";

maplibregl.setWorkerUrl(workerUrl);
maplibregl.addProtocol("pmtiles", new Protocol().tile);

export { maplibregl };
