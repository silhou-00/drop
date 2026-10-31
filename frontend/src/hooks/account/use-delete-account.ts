// Deleting the signed-in owner's account. A lock held in a ref means a double click sends one
// request, and it stays shut after success. On success the reused session is forgotten and the
// browser does a full load of the landing, which clears the inbox, map and session memory. An
// ended session goes to sign-in. A rate limit shows its wait message, and any other failure
// shows the server's message as text.
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { deleteAccount } from "@/lib/account/api";
import { ApiError } from "@/lib/api";
import { forgetSession } from "@/lib/auth/client";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

export function useDeleteAccount() {
    const navigate = useNavigate();
    const lockRef = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    // delete once, then leave the app with a full page load
    async function remove(username: string): Promise<void> {
        if (lockRef.current) {
            return;
        }

        lockRef.current = true;
        setPending(true);
        setError("");

        try {
            await deleteAccount(username);
        } catch (caught) {
            lockRef.current = false;
            setPending(false);

            if (caught instanceof ApiError && caught.status === 401) {
                await navigate({ to: "/sign-in", replace: true });

                return;
            }

            setError(caught instanceof ApiError ? caught.message : FALLBACK_MESSAGE);

            return;
        }

        forgetSession();
        window.location.replace("/");
    }

    return { remove, pending, error };
}
