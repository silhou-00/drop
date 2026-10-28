// Better Auth setup. Email one-time codes are the only sign-in method. Sessions live
// on the server and travel in an httpOnly cookie. Auth routes get their own rate limits.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { config } from "../config/env.js";
import { db } from "../shared/db/client.js";
import * as schema from "./model.js";
import { sendSignInCode } from "./mailer.js";

const DAY_SECONDS = 60 * 60 * 24;
const OTP_LENGTH = 6;
const OTP_EXPIRES_SECONDS = 300;
const OTP_ALLOWED_ATTEMPTS = 3;

export const auth = betterAuth({
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    basePath: "/api/auth",
    trustedOrigins: [config.BETTER_AUTH_URL],
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: false },
    telemetry: { enabled: false },
    session: {
        expiresIn: DAY_SECONDS * 7,
        updateAge: DAY_SECONDS,
    },
    advanced: {
        useSecureCookies: config.BETTER_AUTH_URL.startsWith("https://"),
        defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
        ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
    },
    rateLimit: {
        enabled: true,
        storage: "memory",
        window: 60,
        max: 30,
        customRules: {
            "/email-otp/send-verification-otp": { window: 60, max: 3 },
            "/sign-in/email-otp": { window: 60, max: 10 },
        },
    },
    plugins: [
        emailOTP({
            otpLength: OTP_LENGTH,
            expiresIn: OTP_EXPIRES_SECONDS,
            allowedAttempts: OTP_ALLOWED_ATTEMPTS,
            async sendVerificationOTP({ email, otp, type }) {
                if (type === "sign-in") {
                    await sendSignInCode(email, otp);
                }
            },
        }),
    ],
});
