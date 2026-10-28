// Drizzle column type for Postgres citext (case-insensitive text). The citext
// extension is enabled by migration 0000.
import { customType } from "drizzle-orm/pg-core";

export const citext = customType<{ data: string }>({
    dataType() {
        return "citext";
    },
});
