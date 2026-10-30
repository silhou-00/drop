// Map style for the pin picker. Builds a MapLibre style from the Protomaps basemap layers and
// labels, recoloured with the light Drop palette: the ground and marble pigments from the tokens,
// so the map reads as a calm grey plate and the red pin is the only colour on it. Tiles, glyphs
// and sprites all come from the same origin under /tiles. Only the map chunk imports this file.
import { layers, namedFlavor, type Flavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";
import { MARBLE_PIGMENTS } from "@/lib/marble/tokens";

const SOURCE = "protomaps";
const LABEL_LANG = "en";

// light values from tokens.css (paper, ink-2) and the light marble pigments
const PAPER = "#FFFFFF";
const INK_2 = "#3C474D";
const { ground: GROUND, grey: GREY, street: STREET } = MARBLE_PIGMENTS.light;

// blend two #RRGGBB colours, t from 0 (a) to 1 (b)
function mix(a: string, b: string, t: number) {
    const channel = (hex: string, at: number) => Number.parseInt(hex.slice(at, at + 2), 16);
    const parts = [1, 3, 5].map((at) => Math.round(channel(a, at) + (channel(b, at) - channel(a, at)) * t));

    return `#${parts.map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

// the Drop flavour: ground for land, soft greys for areas, paper roads, ink-2 labels
function dropFlavor(): Flavor {
    const area = mix(GROUND, GREY, 0.1);
    const areaStrong = mix(GROUND, GREY, 0.18);
    const water = mix(GROUND, GREY, 0.32);
    const casing = mix(GROUND, STREET, 0.45);
    const minor = mix(PAPER, GROUND, 0.5);
    const label = mix(INK_2, GREY, 0.35);

    return {
        ...namedFlavor("light"),
        background: GROUND,
        earth: GROUND,
        park_a: area,
        park_b: areaStrong,
        hospital: area,
        industrial: area,
        school: area,
        wood_a: area,
        wood_b: areaStrong,
        pedestrian: mix(GROUND, PAPER, 0.4),
        scrub_a: area,
        scrub_b: areaStrong,
        glacier: PAPER,
        sand: area,
        beach: area,
        aerodrome: area,
        runway: PAPER,
        water,
        zoo: area,
        military: area,
        tunnel_other_casing: casing,
        tunnel_minor_casing: casing,
        tunnel_link_casing: casing,
        tunnel_major_casing: casing,
        tunnel_highway_casing: casing,
        tunnel_other: minor,
        tunnel_minor: minor,
        tunnel_link: minor,
        tunnel_major: minor,
        tunnel_highway: minor,
        pier: area,
        buildings: areaStrong,
        minor_service_casing: casing,
        minor_casing: casing,
        link_casing: casing,
        major_casing_late: casing,
        highway_casing_late: casing,
        other: minor,
        minor_service: minor,
        minor_a: minor,
        minor_b: PAPER,
        link: PAPER,
        major_casing_early: casing,
        major: PAPER,
        highway_casing_early: casing,
        highway: PAPER,
        railway: STREET,
        boundaries: STREET,
        bridges_other_casing: casing,
        bridges_minor_casing: casing,
        bridges_link_casing: casing,
        bridges_major_casing: casing,
        bridges_highway_casing: casing,
        bridges_other: minor,
        bridges_minor: PAPER,
        bridges_link: PAPER,
        bridges_major: PAPER,
        bridges_highway: PAPER,
        roads_label_minor: label,
        roads_label_minor_halo: PAPER,
        roads_label_major: label,
        roads_label_major_halo: PAPER,
        ocean_label: mix(INK_2, water, 0.3),
        subplace_label: label,
        subplace_label_halo: GROUND,
        city_label: INK_2,
        city_label_halo: GROUND,
        state_label: label,
        state_label_halo: GROUND,
        country_label: label,
        address_label: label,
        address_label_halo: PAPER,
        pois: {
            blue: INK_2,
            green: INK_2,
            lapis: INK_2,
            pink: INK_2,
            red: INK_2,
            slategray: INK_2,
            tangerine: INK_2,
            turquoise: INK_2,
        },
        landcover: {
            barren: GROUND,
            farmland: area,
            forest: area,
            glacier: PAPER,
            grassland: area,
            scrub: area,
            urban_area: mix(GROUND, GREY, 0.06),
        },
    };
}

export function buildMapStyle(origin: string): StyleSpecification {
    return {
        version: 8,
        glyphs: `${origin}/tiles/fonts/{fontstack}/{range}.pbf`,
        sprite: `${origin}/tiles/sprites/v4/light`,
        sources: {
            [SOURCE]: {
                type: "vector",
                url: `pmtiles://${origin}/tiles/philippines.pmtiles`,
            },
        },
        layers: layers(SOURCE, dropFlavor(), { lang: LABEL_LANG }),
    };
}
