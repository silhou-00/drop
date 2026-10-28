// Better Auth client for the web app. Sign-in is by email code only: send a code, then
// check it, which sets the httpOnly session cookie on this origin. Failures become the
// shared ApiError so pages show one kind of error. The session is read from the server
// on every call; nothing about it is kept in browser storage.
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ApiError, rateLimitMessage } from "@/lib/api";

const FALLBACK_MESSAGE = "Something went wrong. Try again.";

const authClient = createAuthClient({
    baseURL: window.location.origin,
    basePath: "/api/auth",
    plugins: [emailOTPClient()],
});

type AuthFailure = { status: number; code?: string; message?: string } | null;

// a failed auth call as an ApiError; the raw message never reaches the page
function toApiError(error: NonNullable<AuthFailure>, retryAfter: string | null) {
    if (error.status === 429) {
        return new ApiError(429, "RATE_LIMITED", rateLimitMessage(retryAfter));
    }

    return new ApiError(error.status, error.code ?? "AUTH_ERROR", FALLBACK_MESSAGE);
}

// reads the wait time a 429 carries
function retryReader() {
    const state = { retryAfter: null as string | null };

    return {
        state,
        fetchOptions: {
            onError(context: { response: Response }) {
                state.retryAfter = context.response.headers.get("X-Retry-After");
            },
        },
    };
}

export async function sendCode(email: string) {
    const reader = retryReader();
    const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
        fetchOptions: reader.fetchOptions,
    });

    if (error) {
        throw toApiError(error, reader.state.retryAfter);
    }
}

export async function verifyCode(email: string, otp: string) {
    const reader = retryReader();
    const { error } = await authClient.signIn.emailOtp({ email, otp, fetchOptions: reader.fetchOptions });

    if (error) {
        throw toApiError(error, reader.state.retryAfter);
    }
}

export async function signOut() {
    const { error } = await authClient.signOut();

    if (error) {
        throw toApiError(error, null);
    }
}

// the current session for route guards, null when signed out or unreachable
export async function getSession() {
    const { data } = await authClient.getSession();

    return data ?? null;
}

export const useSession = authClient.useSession;
