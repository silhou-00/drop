// Sign-in code mailer. Sends the one-time code to the user through Resend, in the designed
// email from sign-in-email.ts. The address and the code are never logged; a failure logs a
// short error name and throws.
import { Resend } from "resend";
import { config } from "../config/env.js";
import { buildSignInEmail } from "./sign-in-email.js";

const resend = new Resend(config.RESEND_API_KEY);

export async function sendSignInCode(email: string, code: string) {
    const { subject, text, html } = buildSignInEmail(code, config.BETTER_AUTH_URL);

    const { error } = await resend.emails.send({
        from: config.EMAIL_FROM,
        to: email,
        subject,
        text,
        html,
    });

    if (error) {
        console.error("Sign-in email failed:", error.name);

        throw new Error("EMAIL_SEND_FAILED");
    }
}
