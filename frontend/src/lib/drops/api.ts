// Drop calls to the API. Sending a drop to a profile by name: the body is multipart form data
// with text fields, the message and, always, the GPS location as latitude, longitude and its
// source, plus the photo file when there is one. The inbox calls list the signed-in user's
// drops a page at a time (all, unread or with a photo), read one, set its read flag and delete it. The photo is never
// fetched here: the page loads it as an image from the path built below, and only for an id
// that passes the UUID check. A failure arrives as an ApiError with the server's status and code.
import { apiRequest } from "@/lib/api";
import { formatCoordinate, isDropId, type DropDraft, type InboxFilter, type InboxItem, type InboxPage } from "./model";

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

// one inbox page, newest first; "all" sends no filter, and the cursor comes from the page before
export function listDrops({ cursor, filter }: { cursor?: string | null; filter?: InboxFilter }, signal?: AbortSignal) {
    const params = new URLSearchParams();

    if (filter && filter !== "all") {
        params.set("filter", filter);
    }

    if (cursor) {
        params.set("cursor", cursor);
    }

    const text = params.toString();
    const query = text ? `?${text}` : "";

    return apiRequest<InboxPage>(`/api/v1/drops${query}`, { signal });
}

export function getDrop(id: string, signal?: AbortSignal) {
    return apiRequest<InboxItem>(`/api/v1/drops/${encodeURIComponent(id)}`, { signal });
}

export function setDropRead(id: string, isRead: boolean) {
    return apiRequest<InboxItem>(`/api/v1/drops/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify({ is_read: isRead }),
    });
}

export function deleteDrop(id: string) {
    return apiRequest<undefined>(`/api/v1/drops/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// same-origin photo path for a valid drop id, otherwise null
export function dropPhotoPath(id: string) {
    return isDropId(id) ? `/api/v1/drops/${id}/photo` : null;
}
