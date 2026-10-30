// The small map on a drop's page. MapLibre draws the Philippines extract from the same origin
// through the pmtiles protocol, styled in the Drop palette. The drop's place is a soft circle of
// about 150 m around the rounded point the server stored, because that is as close as the place
// is known, with an "About 150 m" label in the corner. Glass buttons zoom in, zoom out and bring
// the view back to the drop; the map can also be panned but changes nothing. Credits for
// OpenStreetMap, Protomaps and LocationIQ sit in the corner as plain links. The page loads this
// file lazily, so MapLibre, its worker and its stylesheet load only on a drop's page.
import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { CrosshairSimple, Minus, Plus } from "@phosphor-icons/react";
import { Protocol } from "pmtiles";
import { useMemo, useRef } from "react";
import MapView, { Layer, Source, type MapRef } from "react-map-gl/maplibre";
import { buildMapStyle } from "@/lib/map/style";

type DropMapProps = { latitude: number; longitude: number };

const MAX_BOUNDS: [number, number, number, number] = [116.9, 4.6, 126.6, 21.1];
const MIN_ZOOM = 5;
const MAX_ZOOM = 15;
const START_ZOOM = 14;
const CREDIT_REL = "noopener noreferrer";
const AREA_RADIUS_M = 150;
const AREA_STEPS = 64;
const METRES_PER_DEGREE = 111320;

// accent-fill from tokens.css; MapLibre paint takes colours, not CSS variables
const AREA_COLOUR = "#FF3131";

// the bundled worker file and the pmtiles protocol, registered once when this chunk loads
maplibregl.setWorkerUrl(workerUrl);
maplibregl.addProtocol("pmtiles", new Protocol().tile);

// a ring of points about 150 m around the centre, as a GeoJSON polygon
function areaAround(latitude: number, longitude: number) {
    const latStep = AREA_RADIUS_M / METRES_PER_DEGREE;
    const lngStep = AREA_RADIUS_M / (METRES_PER_DEGREE * Math.cos((latitude * Math.PI) / 180));
    const ring: [number, number][] = [];

    for (let index = 0; index <= AREA_STEPS; index += 1) {
        const angle = (index / AREA_STEPS) * Math.PI * 2;

        ring.push([longitude + lngStep * Math.cos(angle), latitude + latStep * Math.sin(angle)]);
    }

    return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [ring] } };
}

export function DropMap({ latitude, longitude }: DropMapProps) {
    const mapRef = useRef<MapRef>(null);
    const mapStyle = useMemo(() => buildMapStyle(window.location.origin), []);
    const area = useMemo(() => areaAround(latitude, longitude), [latitude, longitude]);

    function handleRecentre() {
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: START_ZOOM });
    }

    return (
        <div className="inbox-map">
            <MapView
                ref={mapRef}
                mapLib={maplibregl}
                mapStyle={mapStyle}
                initialViewState={{ latitude, longitude, zoom: START_ZOOM }}
                maxBounds={MAX_BOUNDS}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                attributionControl={false}
                dragRotate={false}
                pitchWithRotate={false}
                touchPitch={false}
            >
                <Source id="drop-area" type="geojson" data={area}>
                    <Layer
                        id="drop-area-fill"
                        type="fill"
                        paint={{ "fill-color": AREA_COLOUR, "fill-opacity": 0.18 }}
                    />
                    <Layer
                        id="drop-area-edge"
                        type="line"
                        paint={{ "line-color": AREA_COLOUR, "line-opacity": 0.7, "line-width": 2 }}
                    />
                </Source>
            </MapView>

            {/* zoom and recentre */}
            <div className="inbox-map-ctl">
                <button
                    className="inbox-map-btn"
                    type="button"
                    aria-label="Zoom in"
                    onClick={() => {
                        mapRef.current?.zoomIn();
                    }}
                >
                    <Plus weight="bold" aria-hidden="true" />
                </button>
                <button
                    className="inbox-map-btn"
                    type="button"
                    aria-label="Zoom out"
                    onClick={() => {
                        mapRef.current?.zoomOut();
                    }}
                >
                    <Minus weight="bold" aria-hidden="true" />
                </button>
                <button className="inbox-map-btn" type="button" aria-label="Back to the drop" onClick={handleRecentre}>
                    <CrosshairSimple weight="bold" aria-hidden="true" />
                </button>
            </div>

            <p className="inbox-map-label">About 150 m</p>

            {/* map credits */}
            <p className="inbox-map-credit">
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel={CREDIT_REL}>
                    © OpenStreetMap
                </a>
                <a href="https://protomaps.com" target="_blank" rel={CREDIT_REL}>
                    Protomaps
                </a>
                <a href="https://locationiq.com" target="_blank" rel={CREDIT_REL}>
                    Search by LocationIQ.com
                </a>
            </p>
        </div>
    );
}
