// Shared fetch wrapper for the Drop API. Sends and reads JSON on the same origin with the
// session cookie, unwraps the { data, error } envelope, and turns every failure into an
// ApiError carrying the status, the error code and a message that is safe to show. A 429
// reads Retry-After and becomes a plain "try again in" message. Error text is shown as text.

const NETWORK_MESSAGE = "Could not reach Drop. Check your connection and try again.";
const FALLBACK_MESSAGE = "Something went wrong. Try again.";

type Envelope<T> = { data: T | null; error: { code: string; message: string } | null };

export class ApiError extends Error {
    status: number;
    code: string;

    constructor(status: number, code: string, message: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

// user-facing wait message from a Retry-After value in seconds
export function rateLimitMessage(retryAfter: string | null) {
    const seconds = Number.parseInt(retryAfter ?? "", 10);

    if (!Number.isFinite(seconds) || seconds <= 0) {
        return "Too many tries. Wait a moment and try again.";
    }

    if (seconds === 1) {
        return "Too many tries. Try again in 1 second.";
    }

    return `Too many tries. Try again in ${seconds} seconds.`;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    let response: Response;

    headers.set("Accept", "application/json");

    if (init.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    try {
        response = await fetch(path, { ...init, headers, credentials: "same-origin" });
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
        }

        throw new ApiError(0, "NETWORK_ERROR", NETWORK_MESSAGE);
    }

    if (response.status === 429) {
        throw new ApiError(429, "RATE_LIMITED", rateLimitMessage(response.headers.get("Retry-After")));
    }

    const body = (await response.json().catch(() => null)) as Envelope<T> | null;

    if (!response.ok || !body || body.error || body.data === null) {
        const code = body?.error?.code ?? "UNKNOWN_ERROR";
        const message = response.status >= 500 ? FALLBACK_MESSAGE : (body?.error?.message ?? FALLBACK_MESSAGE);

        throw new ApiError(response.status, code, message);
    }

    return body.data;
}
