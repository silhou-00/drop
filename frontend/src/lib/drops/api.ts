// Drop call to the API: sending a drop to a profile by name. The body is multipart form data
// with text fields: the message and, always, the GPS location as latitude, longitude and its
// source, plus the photo file when there is one. A failure arrives as an ApiError with the
// server's status and code.
import { apiRequest } from "@/lib/api";
import { formatCoordinate, type DropDraft } from "./model";

export function sendDrop(username: string, draft: DropDraft) {
    const form = new FormData();

    form.append("message", draft.message);
    form.append("latitude", formatCoordinate(draft.location.latitude));
    form.append("longitude", formatCoordinate(draft.location.longitude));
    form.append("location_source", draft.location.source);

    if (draft.photo) {
        form.append("photo", draft.photo);
    }

    return apiRequest<{ delivered: true }>(`/api/v1/profiles/${encodeURIComponent(username)}/drops`, {
        method: "POST",
        body: form,
    });
}
