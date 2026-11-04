// Sign-in code mailer. Sends the one-time code to the user through Resend, in the designed
// email from sign-in-email.ts, with the logo attached inline. The logo is read once at start
// from the backend's assets folder. The address and the code are never logged; a failure logs
// a short error name and throws.
import { readFileSync } from "node:fs";
import path from "node:path";
import { Resend } from "resend";
import { config } from "../config/env.js";
import { LOGO_CONTENT_ID, LOGO_FILE_NAME, buildSignInEmail } from "./sign-in-email.js";

const resend = new Resend(config.RESEND_API_KEY);
const logo = readFileSync(path.resolve(import.meta.dirname, "../../assets", LOGO_FILE_NAME));

export async function sendSignInCode(email: string, code: string) {
    const { subject, text, html } = buildSignInEmail(code, config.BETTER_AUTH_URL);

    const { error } = await resend.emails.send({
        from: config.EMAIL_FROM,
        to: email,
        subject,
        text,
        html,
        attachments: [{ filename: LOGO_FILE_NAME, content: logo, contentId: LOGO_CONTENT_ID }],
    });

    if (error) {
        console.error("Sign-in email failed:", error.name);

        throw new Error("EMAIL_SEND_FAILED");
    }
}
