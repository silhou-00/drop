// A public profile by name, for the send page. The name is lowercased and checked against the
// username rule first, so a bad or reserved name is not-found without a request. The request
// also sets the device cookie the send needs. It is cancelled when the name changes or the
// page leaves.
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getPublicProfile } from "@/lib/profiles/api";
import { checkUsername, type PublicProfile } from "@/lib/profiles/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export type PublicProfileState = {
    status: "loading" | "ready" | "not-found" | "error";
    profile: PublicProfile | null;
    error: string | null;
};

const LOADING: PublicProfileState = { status: "loading", profile: null, error: null };
const NOT_FOUND: PublicProfileState = { status: "not-found", profile: null, error: null };

export function usePublicProfile(username: string): PublicProfileState {
    const name = username.toLowerCase();
    const valid = checkUsername(name).ok;
    const [result, setResult] = useState<{ name: string; state: PublicProfileState } | null>(null);

    useEffect(() => {
        if (!valid) {
            return;
        }

        const controller = new AbortController();

        getPublicProfile(name, controller.signal).then(
            (profile) => {
                setResult({ name, state: { status: "ready", profile, error: null } });
            },
            (error: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                if (error instanceof ApiError && error.status === 404) {
                    setResult({ name, state: NOT_FOUND });
                } else {
                    setResult({
                        name,
                        state: {
                            status: "error",
                            profile: null,
                            error: error instanceof ApiError ? error.message : FALLBACK_MESSAGE,
                        },
                    });
                }
            },
        );

        return () => {
            controller.abort();
        };
    }, [name, valid]);

    if (!valid) {
        return NOT_FOUND;
    }

    // a result for an earlier name counts as loading
    return result && result.name === name ? result.state : LOADING;
}
