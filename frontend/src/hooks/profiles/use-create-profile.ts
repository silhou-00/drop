// Creating the signed-in user's profile. Holds a lock so a double click sends one request,
// and keeps the last failure as an ApiError so the claim page can place it: a taken name on
// the name field, anything else under the form. The server checks every rule again.
import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { createProfile } from "@/lib/profiles/api";
import type { CreateProfileInput, OwnProfile } from "@/lib/profiles/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export function useCreateProfile() {
    const lockRef = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<ApiError | null>(null);

    // resolves with the new profile, or null when it failed or was already sending;
    // the lock stays shut after success because the page moves on
    async function create(input: CreateProfileInput): Promise<OwnProfile | null> {
        if (lockRef.current) {
            return null;
        }

        lockRef.current = true;
        setPending(true);
        setError(null);

        try {
            return await createProfile(input);
        } catch (caught) {
            lockRef.current = false;
            setPending(false);
            setError(caught instanceof ApiError ? caught : new ApiError(0, "UNKNOWN_ERROR", FALLBACK_MESSAGE));

            return null;
        }
    }

    function clearError() {
        setError(null);
    }

    return { create, pending, error, clearError };
}
