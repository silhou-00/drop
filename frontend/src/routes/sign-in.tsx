// Sign-in page. Step one takes an email and asks the server to send a six-digit code; step
// two takes the code, which signs the person in. The copy never says whether an email has an
// account, and a wrong or expired code gets one neutral message. A new code can be asked for
// once a minute, with the wait shown. After sign-in, a person with a profile goes to the inbox and
// anyone else goes on to claim a link, carrying the name picked on the landing if it is valid.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { ApiError } from "@/lib/api";
import { sendCode, verifyCode } from "@/lib/auth/client";
import { getOwnProfile } from "@/lib/profiles/api";
import { usernameFromSearch } from "@/lib/profiles/model";

type Step = "email" | "code";

const CODE_LENGTH = 6;
const EMAIL_MAX = 254;
const RESEND_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MESSAGE = "Enter a valid email address.";
const SENT_MESSAGE = "If that email can sign in, a code is on its way.";
const SEND_FAILED_MESSAGE = "Could not send a code. Try again.";
const CODE_SHORT_MESSAGE = "Enter the six-digit code from the email.";
const CODE_FAILED_MESSAGE = "That code did not work. Check it or send a new one.";

export const Route = createFileRoute("/sign-in")({
    validateSearch: usernameFromSearch,
    component: SignInPage,
});

// the message for a failed call: waits and network trouble say so, the rest stay neutral
function failureMessage(error: unknown, neutral: string) {
    if (error instanceof ApiError && (error.status === 429 || error.status === 0)) {
        return error.message;
    }

    return neutral;
}

// where a freshly signed-in person belongs; when unsure, the claim page checks again
async function destinationAfterSignIn(): Promise<"/inbox" | "/claim"> {
    try {
        await getOwnProfile();

        return "/inbox";
    } catch {
        return "/claim";
    }
}

function SignInPage() {
    const { username } = Route.useSearch();
    const navigate = useNavigate();
    const lockRef = useRef(false);
    const movedRef = useRef(false);
    const emailRef = useRef<HTMLInputElement>(null);
    const codeRef = useRef<HTMLInputElement>(null);
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [resendAt, setResendAt] = useState(0);
    const [now, setNow] = useState(0);
    const wait = Math.max(0, Math.ceil((resendAt - now) / 1000));

    // focus follows the step once the person has moved between them
    useEffect(() => {
        if (!movedRef.current) {
            return;
        }

        if (step === "code") {
            codeRef.current?.focus();
        } else {
            emailRef.current?.focus();
        }
    }, [step]);

    // resend countdown, one tick a second while it runs
    useEffect(() => {
        if (resendAt === 0) {
            return;
        }

        const timer = window.setInterval(() => {
            const current = Date.now();

            setNow(current);

            if (current >= resendAt) {
                window.clearInterval(timer);
            }
        }, 1000);

        return () => {
            window.clearInterval(timer);
        };
    }, [resendAt]);

    // one action at a time; the lock stays shut when the page moves on
    async function runLocked(action: () => Promise<boolean>, neutral: string) {
        if (lockRef.current) {
            return;
        }

        lockRef.current = true;
        setPending(true);
        setError("");

        try {
            if (await action()) {
                return;
            }
        } catch (caught) {
            setError(failureMessage(caught, neutral));
        }

        lockRef.current = false;
        setPending(false);
    }

    function startResendWait() {
        const current = Date.now();

        setNow(current);
        setResendAt(current + RESEND_SECONDS * 1000);
    }

    // step one: send the code
    function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const value = email.trim();

        if (!EMAIL_PATTERN.test(value) || value.length > EMAIL_MAX) {
            setError(EMAIL_MESSAGE);

            return;
        }

        void runLocked(async () => {
            await sendCode(value);
            movedRef.current = true;
            setEmail(value);
            setCode("");
            setNotice(SENT_MESSAGE);
            startResendWait();
            setStep("code");

            return false;
        }, SEND_FAILED_MESSAGE);
    }

    // step two: check the code, then route by profile
    function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (code.length !== CODE_LENGTH) {
            setError(CODE_SHORT_MESSAGE);

            return;
        }

        void runLocked(async () => {
            await verifyCode(email, code);

            const to = await destinationAfterSignIn();

            if (to === "/claim") {
                await navigate({ to: "/claim", search: { username } });
            } else {
                await navigate({ to: "/inbox" });
            }

            return true;
        }, CODE_FAILED_MESSAGE);
    }

    function handleResend() {
        if (wait > 0) {
            return;
        }

        void runLocked(async () => {
            await sendCode(email);
            setCode("");
            setNotice(SENT_MESSAGE);
            startResendWait();
            codeRef.current?.focus();

            return false;
        }, SEND_FAILED_MESSAGE);
    }

    function handleChangeEmail() {
        if (lockRef.current) {
            return;
        }

        movedRef.current = true;
        setError("");
        setNotice("");
        setCode("");
        setStep("email");
    }

    const countdown = `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, "0")}`;

    return (
        <AuthShell>
            {/* sign-in section */}
            <section className="section" aria-labelledby="sign-in-title">
                {/* card */}
                <div className="sub-section auth-card">
                    {/* heading */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <h1 id="sign-in-title" className="auth-title">
                                {step === "email" ? "Sign in" : "Check your email"}
                            </h1>
                        </div>
                        <div className="container">
                            <p className="auth-lede">
                                {step === "email"
                                    ? "We send a six-digit code to your email. There is no password."
                                    : `Enter the code sent to ${email}.`}
                            </p>
                        </div>
                        {username ? (
                            <div className="container">
                                <p className="auth-note">
                                    Next, you claim <span className="auth-mono">drop.link/{username}</span>
                                </p>
                            </div>
                        ) : null}
                    </div>

                    {step === "email" ? (
                        <form className="placement auth-stack" noValidate onSubmit={handleEmailSubmit}>
                            <div className="container">
                                <label className="auth-label" htmlFor="sign-in-email">
                                    Email
                                </label>
                            </div>
                            <div className="container">
                                <input
                                    id="sign-in-email"
                                    className="auth-input"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    inputMode="email"
                                    maxLength={EMAIL_MAX}
                                    placeholder="you@example.com"
                                    value={email}
                                    ref={emailRef}
                                    aria-invalid={error ? true : undefined}
                                    aria-describedby="sign-in-error"
                                    onChange={(event) => {
                                        setEmail(event.target.value);
                                        setError("");
                                    }}
                                />
                            </div>
                            <div className="container">
                                <p id="sign-in-error" className="auth-error" role="alert">
                                    {error}
                                </p>
                            </div>
                            <div className="container">
                                <button className="auth-btn auth-btn-ink" type="submit" disabled={pending}>
                                    {pending ? <span className="auth-spin" aria-hidden="true" /> : null}
                                    {pending ? "Sending" : "Send code"}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form className="placement auth-stack" noValidate onSubmit={handleCodeSubmit}>
                            <div className="container">
                                <p className="auth-status" role="status">
                                    {notice}
                                </p>
                            </div>
                            <div className="container">
                                <label className="auth-label" htmlFor="sign-in-code">
                                    Six-digit code
                                </label>
                            </div>
                            <div className="container">
                                <input
                                    id="sign-in-code"
                                    className="auth-input auth-code"
                                    type="text"
                                    name="code"
                                    autoComplete="one-time-code"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="000000"
                                    value={code}
                                    ref={codeRef}
                                    aria-invalid={error ? true : undefined}
                                    aria-describedby="sign-in-error"
                                    onChange={(event) => {
                                        setCode(event.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH));
                                        setError("");
                                    }}
                                />
                            </div>
                            <div className="container">
                                <p id="sign-in-error" className="auth-error" role="alert">
                                    {error}
                                </p>
                            </div>
                            <div className="container">
                                <button className="auth-btn auth-btn-ink" type="submit" disabled={pending}>
                                    {pending ? <span className="auth-spin" aria-hidden="true" /> : null}
                                    {pending ? "Checking" : "Sign in"}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === "code" ? (
                        // new code and change email
                        <div className="placement auth-row">
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-text"
                                    type="button"
                                    disabled={pending || wait > 0}
                                    onClick={handleResend}
                                >
                                    {wait > 0 ? (
                                        <span>
                                            Send a new code in <span className="auth-mono">{countdown}</span>
                                        </span>
                                    ) : (
                                        "Send a new code"
                                    )}
                                </button>
                            </div>
                            <div className="container">
                                <button
                                    className="auth-btn auth-btn-text"
                                    type="button"
                                    disabled={pending}
                                    onClick={handleChangeEmail}
                                >
                                    Use a different email
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>
            </section>
        </AuthShell>
    );
}
