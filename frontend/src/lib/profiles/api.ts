// Profile calls to the API: the public profile by name, and the signed-in user's own
// profile (read, create, update). Each goes through the shared fetch wrapper, so a failure
// arrives as an ApiError with the server's status and code.
import { apiRequest } from "@/lib/api";
import type { CreateProfileInput, OwnProfile, PublicProfile, UpdateProfileInput } from "./model";

export function getPublicProfile(username: string, signal?: AbortSignal) {
    return apiRequest<PublicProfile>(`/api/v1/profiles/${encodeURIComponent(username)}`, { signal });
}

export function getOwnProfile(signal?: AbortSignal) {
    return apiRequest<OwnProfile>("/api/v1/me/profile", { signal });
}

export function createProfile(input: CreateProfileInput) {
    return apiRequest<OwnProfile>("/api/v1/me/profile", { method: "POST", body: JSON.stringify(input) });
}

export function updateOwnProfile(input: UpdateProfileInput) {
    return apiRequest<OwnProfile>("/api/v1/me/profile", { method: "PATCH", body: JSON.stringify(input) });
}
