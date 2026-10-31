// Statement calls to the API for the signed-in owner: start one, end the running one early,
// and read the running one. A statement id is checked as a UUID before it goes into a path. The
// current statement arrives wrapped as { statement }, null when the link is closed, because the
// shared fetch wrapper treats a null body as a failure. A failure arrives as an ApiError.
import { ApiError, apiRequest } from "@/lib/api";
import { isDropId } from "@/lib/drops/model";
import type { Statement } from "./model";

const NOT_FOUND_MESSAGE = "Not found";

export function startStatement(text: string) {
    return apiRequest<Statement>("/api/v1/me/statements", { method: "POST", body: JSON.stringify({ text }) });
}

// a malformed id fails as the server's 404 would, with no request
export function endStatement(id: string) {
    if (!isDropId(id)) {
        return Promise.reject(new ApiError(404, "NOT_FOUND", NOT_FOUND_MESSAGE));
    }

    return apiRequest<Statement>(`/api/v1/me/statements/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ended: true }),
    });
}

export function getCurrentStatement(signal?: AbortSignal) {
    return apiRequest<{ statement: Statement | null }>("/api/v1/me/statements/current", { signal });
}
