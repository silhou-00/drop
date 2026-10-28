// Sign-in code mailer. Sends the one-time code to the user through Resend. The
// address and the code are never logged; a failure logs a short error name and throws.
import { Resend } from "resend";
import { config } from "../config/env.js";

const CODE_TTL_MINUTES = 5;
const resend = new Resend(config.RESEND_API_KEY);

export async function sendSignInCode(email: string, code: string) {
    const text = `Your Drop code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`;
    const html = `<p>Your Drop code is <strong>${code}</strong>.</p><p>It expires in ${CODE_TTL_MINUTES} minutes.</p>`;

    const { error } = await resend.emails.send({
        from: config.EMAIL_FROM,
        to: email,
        subject: "Your Drop sign-in code",
        text,
        html,
    });

    if (error) {
        console.error("Sign-in email failed:", error.name);

        throw new Error("EMAIL_SEND_FAILED");
    }
}
