// Drop call to the API: sending a drop to a profile by name. The body is multipart form data
// with text fields, and the location fields are present only when the drop has a location.
// A failure arrives as an ApiError with the server's status and code.
import { apiRequest } from "@/lib/api";
import { formatCoordinate, type DropDraft } from "./model";

export function sendDrop(username: string, draft: DropDraft) {
    const form = new FormData();

    form.append("message", draft.message);

    if (draft.location) {
        form.append("latitude", formatCoordinate(draft.location.latitude));
        form.append("longitude", formatCoordinate(draft.location.longitude));
        form.append("location_source", draft.location.source);
    }

    return apiRequest<{ delivered: true }>(`/api/v1/profiles/${encodeURIComponent(username)}/drops`, {
        method: "POST",
        body: form,
    });
}
