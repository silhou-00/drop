// Tests for the statement rules: whitespace collapse, the 120 code point limit, empty
// text, control characters, unknown fields, the end body literal, the id schema, and the
// owner and public serializers.
import { describe, expect, it } from "vitest";
import {
    END_BODY_MESSAGE,
    STATEMENT_MESSAGE,
    createStatementSchema,
    endStatementSchema,
    statementIdSchema,
    toPublicStatement,
    toStatement,
    type StatementView,
} from "./model.js";

function textOf(text: unknown) {
    const result = createStatementSchema.safeParse({ text });

    return result.success ? result.data.text : result.error.issues[0]?.message;
}

describe("createStatementSchema", () => {
    it("collapses every run of whitespace, newlines included, and trims", () => {
        expect(textOf("  out   tonight \n\n at\tthe pier  ")).toBe("out tonight at the pier");
    });

    it("accepts 120 code points and rejects 121, counting an emoji as one", () => {
        expect(textOf("a".repeat(120))).toBe("a".repeat(120));
        expect(textOf("a".repeat(121))).toBe(STATEMENT_MESSAGE);
        expect(textOf("\u{1F600}".repeat(120))).toBe("\u{1F600}".repeat(120));
        expect(textOf("\u{1F600}".repeat(121))).toBe(STATEMENT_MESSAGE);
    });

    it("rejects empty and whitespace-only text", () => {
        expect(textOf("")).toBe(STATEMENT_MESSAGE);
        expect(textOf(" \n\t ")).toBe(STATEMENT_MESSAGE);
    });

    it("rejects NUL and other control characters, and a non-string", () => {
        expect(textOf("a\u0000b")).toBe(STATEMENT_MESSAGE);
        expect(textOf("a\u0007b")).toBe(STATEMENT_MESSAGE);
        expect(textOf("a\u007Fb")).toBe(STATEMENT_MESSAGE);
        expect(textOf(5)).toBe(STATEMENT_MESSAGE);
        expect(textOf(undefined)).toBe(STATEMENT_MESSAGE);
    });

    it("rejects an extra field with the statement message", () => {
        const result = createStatementSchema.safeParse({ text: "hi", statement_id: "x" });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.message).toBe(STATEMENT_MESSAGE);
    });
});

describe("endStatementSchema", () => {
    it("accepts only ended: true", () => {
        expect(endStatementSchema.safeParse({ ended: true }).success).toBe(true);

        for (const body of [{}, { ended: false }, { ended: "true" }, { ended: true, text: "x" }, null]) {
            const result = endStatementSchema.safeParse(body);

            expect(result.success).toBe(false);
            expect(result.error?.issues[0]?.message).toBe(END_BODY_MESSAGE);
        }
    });
});

describe("statementIdSchema", () => {
    it("accepts a uuid and rejects anything else", () => {
        expect(statementIdSchema.safeParse("11111111-1111-4111-8111-111111111111").success).toBe(true);
        expect(statementIdSchema.safeParse("not-an-id").success).toBe(false);
    });
});

const view: StatementView = {
    id: "11111111-1111-4111-8111-111111111111",
    profileId: "22222222-2222-4222-8222-222222222222",
    text: "Out tonight",
    startedAt: new Date("2026-10-31T10:00:00.000Z"),
    endsAt: new Date("2026-10-31T12:00:00.000Z"),
    endedAt: null,
    running: true,
    secondsLeft: 600,
    dropCount: 3,
};

describe("toStatement", () => {
    it("gives the owner shape and never the profile id", () => {
        expect(toStatement(view)).toEqual({
            id: view.id,
            text: "Out tonight",
            started_at: "2026-10-31T10:00:00.000Z",
            ends_at: "2026-10-31T12:00:00.000Z",
            ended_at: null,
            running: true,
            seconds_left: 600,
            drop_count: 3,
        });
    });

    it("serializes an end time", () => {
        const ended = toStatement({ ...view, endedAt: new Date("2026-10-31T11:00:00.000Z"), running: false });

        expect(ended.ended_at).toBe("2026-10-31T11:00:00.000Z");
        expect(ended.running).toBe(false);
    });
});

describe("toPublicStatement", () => {
    it("gives only the text and the time, with no id and no counts", () => {
        const shape = toPublicStatement(view);

        expect(shape).toEqual({ text: "Out tonight", ends_at: "2026-10-31T12:00:00.000Z", seconds_left: 600 });
        expect(Object.keys(shape).sort()).toEqual(["ends_at", "seconds_left", "text"]);
    });
});
