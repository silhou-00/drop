// The full-screen map of the owner's drops. Each place where drops were sent is a red pin with
// its drop count; zoomed out, nearby places merge into one pin, and choosing it zooms in until
// they split. Choosing a single place selects it: the map glides to it and draws the soft
// ~150 m area around it, and choosing it again clears the selection. The glass buttons zoom
// and fit every pin into view; the map never asks for the device's location. The view keeps
// clear of the chips, the list and the controls by asking the page for those edges, plus room
// for the pin drawn above its point. Its limits reach past the Philippines so a wide screen can
// still frame every pin beside the docked list. The page loads this file lazily, so MapLibre
// loads only once there are drops to show.
import { MapPin } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";
import MapView, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import { MapControls } from "@/components/map/map-controls";
import { MapCredits } from "@/components/map/map-credits";
import type { PlaceGroup } from "@/lib/drops/helper";
import { areaAround } from "@/lib/map/area";
import { clusterPlaces, type PlaceCluster } from "@/lib/map/cluster";
import { AREA_COLOUR, MAX_BOUNDS, MAX_ZOOM, MIN_ZOOM, WIDE_BOUNDS, maplibregl } from "@/lib/map/setup";
import { buildMapStyle } from "@/lib/map/style";

type Insets = { top: number; right: number; bottom: number; left: number };

type AllDropsMapProps = {
    groups: PlaceGroup[];
    selectedKey: string | null;
    onSelect: (key: string | null) => void;
    getInsets: () => Insets;
};

type Bounds = [[number, number], [number, number]];

const FOCUS_ZOOM = 15;
const PIN_ROOM: Insets = { top: 52, right: 34, bottom: 30, left: 26 };

function inside(lat: number, lng: number) {
    const [west, south, east, north] = MAX_BOUNDS;

    return lng >= west && lng <= east && lat >= south && lat <= north;
}

// the box around the given places that sit inside the map's limits, or the whole limits
function boundsOf(places: { lat: number; lng: number }[]): Bounds {
    const shown = places.filter((place) => inside(place.lat, place.lng));

    if (shown.length === 0) {
        return [
            [MAX_BOUNDS[0], MAX_BOUNDS[1]],
            [MAX_BOUNDS[2], MAX_BOUNDS[3]],
        ];
    }

    const lngs = shown.map((place) => place.lng);
    const lats = shown.map((place) => place.lat);

    return [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
    ];
}

// the page's edges plus the pin standing above its point, its count badge and the credits row
function withPinRoom(insets: Insets): Insets {
    return {
        top: insets.top + PIN_ROOM.top,
        right: insets.right + PIN_ROOM.right,
        bottom: insets.bottom + PIN_ROOM.bottom,
        left: insets.left + PIN_ROOM.left,
    };
}

function dropsText(count: number) {
    return count === 1 ? "1 drop" : `${count} drops`;
}

// what a screen reader hears for a pin
function pinLabel(cluster: PlaceCluster) {
    if (cluster.places.length > 1) {
        return `${dropsText(cluster.count)} in ${cluster.places.length} places. Zoom in`;
    }

    const name = cluster.places[0]?.name ?? "Unnamed place";
    const unread = cluster.unread > 0 ? `, ${cluster.unread} unread` : "";

    return `${name}, ${dropsText(cluster.count)}${unread}`;
}

export function AllDropsMap({ groups, selectedKey, onSelect, getInsets }: AllDropsMapProps) {
    const mapRef = useRef<MapRef>(null);
    const mapStyle = useMemo(() => buildMapStyle(window.location.origin), []);
    const [zoom, setZoom] = useState<number | null>(null);
    const clusters = useMemo(() => (zoom === null ? [] : clusterPlaces(groups, zoom)), [groups, zoom]);
    const selected = groups.find((group) => group.key === selectedKey) ?? null;
    const selectedLat = selected?.lat;
    const selectedLng = selected?.lng;
    const insetsRef = useRef(getInsets);
    const area = useMemo(
        () => (selectedLat === undefined || selectedLng === undefined ? null : areaAround(selectedLat, selectedLng)),
        [selectedLat, selectedLng],
    );

    // the first view: the selected place close up, or every place in view, clear of the panels
    const [initialView] = useState(() => ({
        bounds: boundsOf(selected ? [selected] : groups),
        fitBoundsOptions: { padding: withPinRoom(getInsets()), maxZoom: FOCUS_ZOOM },
    }));

    // the latest edge reader, so only a change of place moves the map
    useEffect(() => {
        insetsRef.current = getInsets;
    });

    // glide to a newly selected place, clear of the panels
    useEffect(() => {
        if (selectedLat === undefined || selectedLng === undefined) {
            return;
        }

        mapRef.current?.easeTo({ center: [selectedLng, selectedLat], padding: withPinRoom(insetsRef.current()) });
    }, [selectedLat, selectedLng]);

    function fitAll() {
        mapRef.current?.fitBounds(boundsOf(groups), { padding: withPinRoom(getInsets()), maxZoom: FOCUS_ZOOM });
    }

    function handlePin(cluster: PlaceCluster) {
        if (cluster.places.length > 1) {
            mapRef.current?.fitBounds(boundsOf(cluster.places), {
                padding: withPinRoom(getInsets()),
                maxZoom: FOCUS_ZOOM,
            });

            return;
        }

        onSelect(cluster.key === selectedKey ? null : cluster.key);
    }

    return (
        <div className="map-view" role="region" aria-label="Map of your drops">
            <MapView
                ref={mapRef}
                mapLib={maplibregl}
                mapStyle={mapStyle}
                initialViewState={initialView}
                maxBounds={WIDE_BOUNDS}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                attributionControl={false}
                dragRotate={false}
                pitchWithRotate={false}
                touchPitch={false}
                onLoad={(event) => {
                    setZoom(Math.round(event.target.getZoom()));
                }}
                onZoomEnd={(event) => {
                    setZoom(Math.round(event.viewState.zoom));
                }}
            >
                {area ? (
                    <Source id="place-area" type="geojson" data={area}>
                        <Layer
                            id="place-area-fill"
                            type="fill"
                            paint={{ "fill-color": AREA_COLOUR, "fill-opacity": 0.18 }}
                        />
                        <Layer
                            id="place-area-edge"
                            type="line"
                            paint={{ "line-color": AREA_COLOUR, "line-width": 2, "line-dasharray": [2, 2] }}
                        />
                    </Source>
                ) : null}

                {clusters.map((cluster) => (
                    <Marker key={cluster.key} latitude={cluster.lat} longitude={cluster.lng} anchor="bottom">
                        <button
                            className="map-pin"
                            type="button"
                            data-place={cluster.key}
                            aria-label={pinLabel(cluster)}
                            aria-pressed={cluster.places.length > 1 ? undefined : cluster.key === selectedKey}
                            onClick={() => {
                                handlePin(cluster);
                            }}
                        >
                            <MapPin weight="fill" aria-hidden="true" />
                            <b aria-hidden="true">{cluster.count}</b>
                        </button>
                    </Marker>
                ))}
            </MapView>

            {/* zoom and fit */}
            <MapControls
                className="map-ctl"
                onZoomIn={() => {
                    mapRef.current?.zoomIn();
                }}
                onZoomOut={() => {
                    mapRef.current?.zoomOut();
                }}
                onLocate={fitAll}
                locateLabel="Show all drops"
            />

            {/* map credits */}
            <MapCredits />
        </div>
    );
}
