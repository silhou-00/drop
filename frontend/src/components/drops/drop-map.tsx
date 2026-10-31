// The small map on a drop's page. MapLibre draws the Philippines extract from the same origin
// through the pmtiles protocol, styled in the Drop palette. The drop's place is a soft circle of
// about 150 m around the rounded point the server stored, because that is as close as the place
// is known, with an "About 150 m" label in the corner. Glass buttons zoom in, zoom out and bring
// the view back to the drop; the map can also be panned but changes nothing. Credits for
// OpenStreetMap, Protomaps and LocationIQ sit in the corner as plain links. The page loads this
// file lazily, so MapLibre, its worker and its stylesheet (set up once in the shared map setup)
// load only on a page that shows a map.
import { useMemo, useRef } from "react";
import MapView, { Layer, Source, type MapRef } from "react-map-gl/maplibre";
import { MapControls } from "@/components/map/map-controls";
import { MapCredits } from "@/components/map/map-credits";
import { areaAround } from "@/lib/map/area";
import { AREA_COLOUR, MAX_BOUNDS, MAX_ZOOM, MIN_ZOOM, maplibregl } from "@/lib/map/setup";
import { buildMapStyle } from "@/lib/map/style";

type DropMapProps = { latitude: number; longitude: number };

const START_ZOOM = 14;

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
            <MapControls
                onZoomIn={() => {
                    mapRef.current?.zoomIn();
                }}
                onZoomOut={() => {
                    mapRef.current?.zoomOut();
                }}
                onLocate={handleRecentre}
                locateLabel="Back to the drop"
            />

            <p className="inbox-map-label">About 150 m</p>

            {/* map credits */}
            <MapCredits />
        </div>
    );
}
