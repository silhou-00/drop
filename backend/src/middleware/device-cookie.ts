// Device cookie. Gives each browser a random id in an httpOnly cookie, so the send limits
// can count a device and not only an IP. A missing or malformed cookie is replaced.
// The id is a rate-limit hint, never an identity, and is stored only as a keyed hash.
import { randomBytes } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { AppEnv } from "./session.js";

const SECURE_NAME = "__Host-drop_device";
const DEV_NAME = "drop_device";
const ID_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ID_BYTES = 32;
const MAX_AGE_SECONDS = 31_536_000;

export function createDeviceCookie({ secure }: { secure: boolean }): MiddlewareHandler<AppEnv> {
    const name = secure ? SECURE_NAME : DEV_NAME;

    return async (c, next) => {
        const existing = getCookie(c, name);

        if (existing !== undefined && ID_PATTERN.test(existing)) {
            c.set("deviceId", existing);
        } else {
            const id = randomBytes(ID_BYTES).toString("base64url");

            setCookie(c, name, id, {
                httpOnly: true,
                sameSite: "Lax",
                path: "/",
                maxAge: MAX_AGE_SECONDS,
                secure,
            });
            c.set("deviceId", id);
        }

        await next();
    };
}
