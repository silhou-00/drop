// Signing out from the settings page. A lock held in a ref means a double tap signs out once.
// On success the session cookie is cleared by the server and the page goes to sign-in. A rate
// limit shows its wait message; any other failure a plain retry message.
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { signOut as endSession } from "@/lib/auth/client";

const SIGN_OUT_FAILED_MESSAGE = "Could not sign out. Try again.";

export function useSignOut() {
    const navigate = useNavigate();
    const lockRef = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    // sign out once, then back to sign-in
    async function signOut() {
        if (lockRef.current) {
            return;
        }

        lockRef.current = true;
        setPending(true);
        setError("");

        try {
            await endSession();
            await navigate({ to: "/sign-in", replace: true });
        } catch (caught) {
            lockRef.current = false;
            setPending(false);
            setError(caught instanceof ApiError && caught.status === 429 ? caught.message : SIGN_OUT_FAILED_MESSAGE);
        }
    }

    return { signOut, pending, error };
}
