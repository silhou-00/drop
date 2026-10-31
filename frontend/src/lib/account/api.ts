// Account calls to the API. Deleting the account sends the typed link name, and the server
// answers 204 with the session cookie cleared. A failure arrives as an ApiError.
import { apiRequest } from "@/lib/api";

export function deleteAccount(username: string): Promise<void> {
    return apiRequest<void>("/api/v1/me", { method: "DELETE", body: JSON.stringify({ username }) });
}
