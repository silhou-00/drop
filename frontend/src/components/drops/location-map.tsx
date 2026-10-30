// The map inside the pin sheet. MapLibre draws the Philippines extract from the same origin
// through the pmtiles protocol, styled in the Drop palette. The pin is a fixed marker at the
// centre: the sender pans the map under it, and the centre is reported each time a move ends.
// Credits for OpenStreetMap, Protomaps and LocationIQ sit in the corner as plain links. This
// file and the MapLibre stylesheet load only with the sheet, so the send page stays light.
import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { MapPin } from "@phosphor-icons/react";
import { Protocol } from "pmtiles";
import { useMemo } from "react";
import MapView, { type ViewStateChangeEvent } from "react-map-gl/maplibre";
import { buildMapStyle } from "@/lib/map/style";

export type MapCenter = { latitude: number; longitude: number };

type LocationMapProps = {
    initialCenter: MapCenter;
    initialZoom: number;
    onCenterChange: (center: MapCenter) => void;
};

const MAX_BOUNDS: [number, number, number, number] = [116.9, 4.6, 126.6, 21.1];
const MIN_ZOOM = 5;
const MAX_ZOOM = 15;
const CREDIT_REL = "noopener noreferrer";

// the bundled worker file and the pmtiles protocol, registered once when this chunk loads
maplibregl.setWorkerUrl(workerUrl);
maplibregl.addProtocol("pmtiles", new Protocol().tile);

export function LocationMap({ initialCenter, initialZoom, onCenterChange }: LocationMapProps) {
    const mapStyle = useMemo(() => buildMapStyle(window.location.origin), []);

    function handleMoveEnd(event: ViewStateChangeEvent) {
        onCenterChange({ latitude: event.viewState.latitude, longitude: event.viewState.longitude });
    }

    return (
        <div className="send-map">
            <MapView
                mapLib={maplibregl}
                mapStyle={mapStyle}
                initialViewState={{ ...initialCenter, zoom: initialZoom }}
                maxBounds={MAX_BOUNDS}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                attributionControl={false}
                dragRotate={false}
                pitchWithRotate={false}
                touchPitch={false}
                onMoveEnd={handleMoveEnd}
            />

            {/* fixed centre pin: its tip marks the chosen point */}
            <div className="send-map-pin" aria-hidden="true">
                <MapPin weight="fill" />
            </div>

            {/* map credits */}
            <p className="send-map-credit">
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
