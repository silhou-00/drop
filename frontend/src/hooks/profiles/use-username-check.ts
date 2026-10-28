// Live availability for a link name. The mirrored server rule runs first, so an invalid or
// reserved name shows its message with no request. A valid name waits for typing to settle,
// then asks for the public profile: 404 means free, 200 means taken. A newer name aborts the
// request still in flight. Any other failure leaves the name unchecked; the server decides.
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { getPublicProfile } from "@/lib/profiles/api";
import { USERNAME_TAKEN_MESSAGE, checkUsername } from "@/lib/profiles/model";

const DEBOUNCE_MS = 350;

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export type UsernameCheckState = { status: UsernameStatus; message: string; username: string };

type Remote = { username: string; status: UsernameStatus; message: string };

export function useUsernameCheck(input: string): UsernameCheckState {
    const check = checkUsername(input);
    const value = check.ok ? check.value : "";
    const [remote, setRemote] = useState<Remote>({ username: "", status: "idle", message: "" });

    // remote check for a valid name, after typing settles
    useEffect(() => {
        if (!value) {
            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(async () => {
            try {
                await getPublicProfile(value, controller.signal);
                setRemote({ username: value, status: "taken", message: USERNAME_TAKEN_MESSAGE });
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                if (error instanceof ApiError && error.status === 404) {
                    setRemote({ username: value, status: "available", message: "" });
                } else {
                    setRemote({
                        username: value,
                        status: "idle",
                        message: error instanceof ApiError ? error.message : "",
                    });
                }
            }
        }, DEBOUNCE_MS);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [value]);

    if (input.trim() === "") {
        return { status: "idle", message: "", username: "" };
    }

    if (!check.ok) {
        return { status: "invalid", message: check.message, username: "" };
    }

    if (remote.username !== value) {
        return { status: "checking", message: "", username: value };
    }

    return { status: remote.status, message: remote.message, username: value };
}
