// Business rules for statements. Each call first finds the signed-in user's own
// profile, and answers 404 when there is none. Starting closes any open statement and
// opens a new one for the fixed time. Ending answers 404 for a statement that is
// missing, malformed or someone else's, and 409 for one that has already ended.
import type { Profile } from "../profiles/model.js";
import { AppError } from "../shared/errors.js";
import {
    STATEMENT_ENDED_MESSAGE,
    statementIdSchema,
    toStatement,
    type CreateStatementInput,
    type Statement,
} from "./model.js";
import type { StatementRepository } from "./repository.js";

type Dependencies = {
    findOwnProfile: (userId: string) => Promise<Pick<Profile, "id"> | null>;
    statements: Pick<StatementRepository, "start" | "end" | "findRunning">;
};

function notFound() {
    return new AppError(404, "NOT_FOUND", "Not found");
}

export function createStatementService({ findOwnProfile, statements }: Dependencies) {
    async function ownProfileId(userId: string): Promise<string> {
        const profile = await findOwnProfile(userId);

        if (!profile) {
            throw notFound();
        }

        return profile.id;
    }

    async function startStatement(userId: string, input: CreateStatementInput): Promise<Statement> {
        const profileId = await ownProfileId(userId);

        return toStatement(await statements.start(profileId, input.text));
    }

    // a malformed id gets the same 404 as a missing statement
    async function endStatement(userId: string, id: string): Promise<Statement> {
        const profileId = await ownProfileId(userId);
        const parsed = statementIdSchema.safeParse(id);

        if (!parsed.success) {
            throw notFound();
        }

        const result = await statements.end(profileId, parsed.data);

        if (result.status === "missing") {
            throw notFound();
        }

        if (result.status === "not-running") {
            throw new AppError(409, "STATEMENT_ENDED", STATEMENT_ENDED_MESSAGE);
        }

        return toStatement(result.view);
    }

    // a closed link answers an object with null, never a null body
    async function getCurrent(userId: string): Promise<{ statement: Statement | null }> {
        const profileId = await ownProfileId(userId);
        const view = await statements.findRunning(profileId);

        return { statement: view ? toStatement(view) : null };
    }

    return { startStatement, endStatement, getCurrent };
}

export type StatementService = ReturnType<typeof createStatementService>;
