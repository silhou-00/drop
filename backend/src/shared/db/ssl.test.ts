// Tests for removing ssl settings from a connection string, keeping everything else.
import { describe, expect, it } from "vitest";
import { withoutSslParams } from "./ssl.js";

describe("withoutSslParams", () => {
    it("drops ssl settings and keeps the rest", () => {
        const url = "postgresql://u:p@host:5432/postgres?sslmode=require&sslrootcert=x.crt&application_name=drop";

        expect(withoutSslParams(url)).toBe("postgresql://u:p@host:5432/postgres?application_name=drop");
    });

    it("leaves a URL with no ssl settings unchanged", () => {
        const url = "postgresql://u:p@host:5432/postgres";

        expect(withoutSslParams(url)).toBe(url);
    });
});
