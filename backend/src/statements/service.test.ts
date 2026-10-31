// Tests for the statement service with a fake repository: start returns the view, no
// profile gives 404, end gives 404 for a missing, foreign or malformed id and 409 for
// one that is not running, and current answers an object with null when closed.
import { describe, expect, it } from "vitest";
import type { StatementView } from "./model.js";
import type { EndResult } from "./repository.js";
import { createStatementService } from "./service.js";

const USER = "user-1";
const PROFILE = "profile-1";
const ID = "11111111-1111-4111-8111-111111111111";

const view: StatementView = {
    id: ID,
    profileId: PROFILE,
    text: "Out tonight",
    startedAt: new Date("2026-10-31T10:00:00.000Z"),
    endsAt: new Date("2026-10-31T12:00:00.000Z"),
    endedAt: null,
    running: true,
    secondsLeft: 7200,
    dropCount: 0,
};

type Options = {
    profile?: boolean;
    end?: EndResult;
    running?: StatementView | null;
};

function build({ profile = true, end = { status: "ended", view }, running = view }: Options = {}) {
    const started: Array<[string, string]> = [];
    const ended: Array<[string, string]> = [];
    const service = createStatementService({
        findOwnProfile: async (userId) => (profile && userId === USER ? { id: PROFILE } : null),
        statements: {
            start: async (profileId, text) => {
                started.push([profileId, text]);

                return { ...view, text };
            },
            end: async (profileId, id) => {
                ended.push([profileId, id]);

                return end;
            },
            findRunning: async () => running,
        },
    });

    return { service, started, ended };
}

describe("startStatement", () => {
    it("starts for the caller's own profile and returns the owner shape", async () => {
        const { service, started } = build();
        const result = await service.startStatement(USER, { text: "Out tonight" });

        expect(started).toEqual([[PROFILE, "Out tonight"]]);
        expect(result).toMatchObject({ id: ID, text: "Out tonight", running: true, seconds_left: 7200, drop_count: 0 });
    });

    it("answers 404 when the user has no profile", async () => {
        await expect(build({ profile: false }).service.startStatement(USER, { text: "x" })).rejects.toMatchObject({
            status: 404,
        });
    });
});

describe("endStatement", () => {
    it("returns the ended statement", async () => {
        const { service, ended } = build();
        const result = await service.endStatement(USER, ID);

        expect(ended).toEqual([[PROFILE, ID]]);
        expect(result.id).toBe(ID);
    });

    it("answers 404 for a missing or foreign id, a malformed id and no profile", async () => {
        const { service, ended } = build({ end: { status: "missing" } });

        await expect(service.endStatement(USER, ID)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
        await expect(service.endStatement(USER, "not-an-id")).rejects.toMatchObject({ status: 404 });
        expect(ended).toHaveLength(1);
        await expect(build({ profile: false }).service.endStatement(USER, ID)).rejects.toMatchObject({ status: 404 });
    });

    it("answers 409 STATEMENT_ENDED when it is not running", async () => {
        await expect(build({ end: { status: "not-running" } }).service.endStatement(USER, ID)).rejects.toMatchObject({
            status: 409,
            code: "STATEMENT_ENDED",
            message: "That statement has already ended.",
        });
    });
});

describe("getCurrent", () => {
    it("returns the running statement", async () => {
        expect((await build().service.getCurrent(USER)).statement).toMatchObject({ id: ID, running: true });
    });

    it("returns an object with a null statement when the link is closed", async () => {
        expect(await build({ running: null }).service.getCurrent(USER)).toEqual({ statement: null });
    });

    it("answers 404 when the user has no profile", async () => {
        await expect(build({ profile: false }).service.getCurrent(USER)).rejects.toMatchObject({ status: 404 });
    });
});
