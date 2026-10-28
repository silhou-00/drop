// The signed-in user's own profile, loaded once when the page mounts. The pages use it to
// decide where the user belongs: a profile sends them home, a 404 to the claim page, and a
// 401 (the session ended) back to sign-in. Other failures carry a message to show as text.
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getOwnProfile } from "@/lib/profiles/api";
import type { OwnProfile } from "@/lib/profiles/model";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export type OwnProfileState =
    | { status: "loading" }
    | { status: "ready"; profile: OwnProfile }
    | { status: "missing" }
    | { status: "signed-out" }
    | { status: "error"; message: string };

export function useOwnProfile(): OwnProfileState {
    const [state, setState] = useState<OwnProfileState>({ status: "loading" });

    useEffect(() => {
        const controller = new AbortController();

        getOwnProfile(controller.signal).then(
            (profile) => {
                setState({ status: "ready", profile });
            },
            (error: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                if (error instanceof ApiError && error.status === 404) {
                    setState({ status: "missing" });
                } else if (error instanceof ApiError && error.status === 401) {
                    setState({ status: "signed-out" });
                } else {
                    setState({
                        status: "error",
                        message: error instanceof ApiError ? error.message : FALLBACK_MESSAGE,
                    });
                }
            },
        );

        return () => {
            controller.abort();
        };
    }, []);

    return state;
}
