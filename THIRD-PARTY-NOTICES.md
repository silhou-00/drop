# Third-party notices

Drop's own code is covered by [LICENSE](LICENSE). The parts below come from others and
stay under their own licenses.

## Map data

| Part                                    | Source                                                                  | License                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Map data inside the map tiles           | © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors | [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/)          |
| Map tile build, styles and icon sprites | [Protomaps](https://protomaps.com) basemaps                             | BSD 3-Clause (code); data as above                                                      |
| Map label fonts (Noto)                  | Google, through Protomaps basemaps assets                               | [SIL Open Font License 1.1](https://openfontlicense.org), text in `tiles/fonts/OFL.txt` |
| Place name lookup                       | [LocationIQ](https://locationiq.com)                                    | LocationIQ terms of service; results carry OpenStreetMap data under ODbL                |

The map tiles are published separately as a release download, not in this repository.
The app shows the OpenStreetMap, Protomaps and LocationIQ credits on every map.

## Fonts

| Font        | License                   |
| ----------- | ------------------------- |
| Unbounded   | SIL Open Font License 1.1 |
| Onest       | SIL Open Font License 1.1 |
| Azeret Mono | SIL Open Font License 1.1 |

They are installed through Fontsource packages.

## Software packages

The app is built on open-source packages from npm (among them React, Vite, Tailwind CSS,
MapLibre GL JS, PMTiles, Phosphor Icons, Hono, Better Auth, Zod and Drizzle ORM). Each
keeps its own license, listed in its package. To list them all, run from the repository
root:

```
pnpm licenses list
```
