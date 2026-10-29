// Place-name cache table and the reading of LocationIQ answers. A place name is a
// neighbourhood level label such as "Diliman, Quezon City". It never includes a road or
// a house number, so a drop cannot point at a doorstep.
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { z } from "zod";

export const placeNames = pgTable(
    "place_names",
    {
        cellKey: text("cell_key").primaryKey(),
        name: varchar("name", { length: 100 }),
        fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [index("place_names_fetched_idx").on(table.fetchedAt)],
);

export const PLACE_NAME_MAX = 100;

// loose on purpose: every field is optional text and unknown fields are ignored
export const locationIqSchema = z.looseObject({
    address: z
        .looseObject({
            name: z.string().optional(),
            neighbourhood: z.string().optional(),
            suburb: z.string().optional(),
            city: z.string().optional(),
        })
        .optional(),
});

export type LocationIqAddress = NonNullable<z.infer<typeof locationIqSchema>["address"]>;

function clean(value: string | undefined) {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
}

// name, else neighbourhood, else suburb, then the city
export function pickPlaceName(address: LocationIqAddress | undefined): string | null {
    if (!address) {
        return null;
    }

    const local = clean(address.name) ?? clean(address.neighbourhood) ?? clean(address.suburb);
    const city = clean(address.city);
    const parts = [local, city].filter((part): part is string => part !== null);

    if (parts.length === 0) {
        return null;
    }

    return Array.from(parts.filter((part, index) => parts.indexOf(part) === index).join(", "))
        .slice(0, PLACE_NAME_MAX)
        .join("");
}
