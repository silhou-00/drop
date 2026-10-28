// Domain error and the global error handler. Services throw AppError with a status and
// a code; anything else becomes a 500 that logs only the error name, never the message.
import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class AppError extends Error {
    status: ContentfulStatusCode;
    code: string;

    constructor(status: ContentfulStatusCode, code: string, message: string) {
        super(message);
        this.name = "AppError";
        this.status = status;
        this.code = code;
    }
}

export const errorHandler: ErrorHandler = (error, c) => {
    if (error instanceof AppError) {
        return c.json({ data: null, error: { code: error.code, message: error.message } }, error.status);
    }

    console.error("Unhandled error:", error.name);

    return c.json({ data: null, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } }, 500);
};
