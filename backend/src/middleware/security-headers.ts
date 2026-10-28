// Security headers for every response: HSTS, nosniff, frame denial, referrer policy and a
// Content Security Policy that lets the built frontend run and nothing else.
import { secureHeaders } from "hono/secure-headers";

const HSTS_MAX_AGE = "max-age=31536000; includeSubDomains";

export function createSecurityHeaders() {
    return secureHeaders({
        strictTransportSecurity: HSTS_MAX_AGE,
        xContentTypeOptions: "nosniff",
        xFrameOptions: "DENY",
        referrerPolicy: "strict-origin-when-cross-origin",
        contentSecurityPolicy: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'"],
            fontSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            workerSrc: ["'self'", "blob:"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
        },
    });
}
