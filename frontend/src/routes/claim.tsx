// Claim page. A signed-in person without a profile picks their link name, with a live check
// that it is valid and free, and adds a display name. Drop is open to everyone, so there is no
// age question. The name picked on the landing arrives pre-filled. A taken name answered by the server shows on the
// name field; anyone who already has a profile goes home. The route guard only spares a trip:
// the server checks the session and every rule again on submit.
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { useCreateProfile } from "@/hooks/profiles/use-create-profile";
import { useOwnProfile } from "@/hooks/profiles/use-own-profile";
import { useUsernameCheck } from "@/hooks/profiles/use-username-check";
import { getSession } from "@/lib/auth/client";
import {
    DISPLAY_NAME_MAX,
    DISPLAY_NAME_MESSAGE,
    USERNAME_MAX,
    USERNAME_TAKEN_MESSAGE,
    checkDisplayName,
    checkUsername,
    usernameFromSearch,
} from "@/lib/profiles/model";

type FieldErrors = { name?: string; displayName?: string };

export const Route = createFileRoute("/claim")({
    validateSearch: usernameFromSearch,
    beforeLoad: async ({ search }) => {
        if (!(await getSession())) {
            throw redirect({ to: "/sign-in", search: { username: search.username } });
        }
    },
    component: ClaimPage,
});

function ClaimPage() {
    const { username: suggested } = Route.useSearch();
    const navigate = useNavigate();
    const own = useOwnProfile();
    const { create, pending, error, clearError } = useCreateProfile();
    const nameRef = useRef<HTMLInputElement>(null);
    const displayNameRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(suggested ?? "");
    const [displayName, setDisplayName] = useState("");
    const [submittedName, setSubmittedName] = useState("");
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const check = useUsernameCheck(name);
    const serverTaken = error?.code === "USERNAME_TAKEN" && submittedName === check.username;
    const movingOn = own.status === "ready" || own.status === "signed-out" || error?.code === "PROFILE_EXISTS";

    // people with a profile go home; an ended session goes back to sign-in
    useEffect(() => {
        if (own.status === "ready" || error?.code === "PROFILE_EXISTS") {
            void navigate({ to: "/home", replace: true });
        } else if (own.status === "signed-out" || error?.status === 401) {
            void navigate({ to: "/sign-in", search: { username: suggested }, replace: true });
        }
    }, [own.status, error, navigate, suggested]);

    const nameMessage = serverTaken
        ? USERNAME_TAKEN_MESSAGE
        : check.status === "invalid" || check.status === "taken"
          ? check.message
          : (fieldErrors.name ?? "");
    const nameStatus =
        check.status === "checking"
            ? "Checking the name"
            : check.status === "available" && !serverTaken
              ? `drop.link/${check.username} is free.`
              : check.status === "idle"
                ? check.message
                : "";
    const formError = error && !serverTaken && error.code !== "USERNAME_TAKEN" && !movingOn ? error.message : "";

    // client checks first, then one create request
    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (pending) {
            return;
        }

        const nameCheck = checkUsername(name);
        const errors: FieldErrors = {};

        if (!nameCheck.ok) {
            errors.name = nameCheck.message;
        } else if (check.status === "taken" || serverTaken) {
            errors.name = USERNAME_TAKEN_MESSAGE;
        }

        if (!checkDisplayName(displayName)) {
            errors.displayName = DISPLAY_NAME_MESSAGE;
        }

        setFieldErrors(errors);

        if (errors.name) {
            nameRef.current?.focus();

            return;
        }

        if (errors.displayName) {
            displayNameRef.current?.focus();

            return;
        }

        if (!nameCheck.ok) {
            return;
        }

        setSubmittedName(nameCheck.value);

        const profile = await create({
            username: nameCheck.value,
            displayName: displayName.trim(),
        });

        if (profile) {
            await navigate({ to: "/home", replace: true });
        }
    }

    if (own.status === "loading" || movingOn) {
        return (
            <AuthShell>
                {/* waiting section */}
                <section className="section" aria-labelledby="claim-title">
                    {/* card */}
                    <div className="sub-section auth-card">
                        <div className="placement auth-stack">
                            <div className="container">
                                <h1 id="claim-title" className="auth-title">
                                    Claim your link
                                </h1>
                            </div>
                            <div className="container">
                                <p className="auth-status" role="status">
                                    Loading
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </AuthShell>
        );
    }

    return (
        <AuthShell>
            {/* claim section */}
            <section className="section" aria-labelledby="claim-title">
                {/* card */}
                <div className="sub-section auth-card">
                    {/* heading */}
                    <div className="placement auth-stack">
                        <div className="container">
                            <h1 id="claim-title" className="auth-title">
                                Claim your link
                            </h1>
                        </div>
                        <div className="container">
                            <p className="auth-lede">Pick the name people will see in your link.</p>
                        </div>
                        {own.status === "error" ? (
                            <div className="container">
                                <p className="auth-error" role="alert">
                                    {own.message}
                                </p>
                            </div>
                        ) : null}
                    </div>

                    {/* claim form */}
                    <form className="placement auth-stack" noValidate onSubmit={handleSubmit}>
                        <div className="container">
                            <label className="auth-label" htmlFor="claim-name">
                                Link name
                            </label>
                        </div>
                        <div className="container">
                            <div className="auth-prefixed" data-invalid={nameMessage ? "true" : undefined}>
                                <span className="auth-mono" aria-hidden="true">
                                    drop.link/
                                </span>
                                <input
                                    id="claim-name"
                                    name="username"
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    spellCheck={false}
                                    placeholder="yourname"
                                    maxLength={USERNAME_MAX}
                                    value={name}
                                    ref={nameRef}
                                    aria-invalid={nameMessage ? true : undefined}
                                    aria-describedby="claim-name-msg claim-name-status"
                                    onChange={(event) => {
                                        setName(event.target.value);
                                        setFieldErrors((current) => ({ ...current, name: undefined }));
                                        clearError();
                                    }}
                                />
                            </div>
                        </div>
                        <div className="container">
                            <p id="claim-name-msg" className="auth-error" role="alert">
                                {nameMessage}
                            </p>
                        </div>
                        <div className="container">
                            <p id="claim-name-status" className="auth-status" role="status">
                                {nameStatus}
                            </p>
                        </div>

                        <div className="container">
                            <label className="auth-label" htmlFor="claim-display">
                                Display name
                            </label>
                        </div>
                        <div className="container">
                            <input
                                id="claim-display"
                                className="auth-input"
                                name="displayName"
                                autoComplete="nickname"
                                maxLength={DISPLAY_NAME_MAX}
                                placeholder="Maya"
                                value={displayName}
                                ref={displayNameRef}
                                aria-invalid={fieldErrors.displayName ? true : undefined}
                                aria-describedby="claim-display-msg"
                                onChange={(event) => {
                                    setDisplayName(event.target.value);
                                    setFieldErrors((current) => ({ ...current, displayName: undefined }));
                                }}
                            />
                        </div>
                        <div className="container">
                            <p id="claim-display-msg" className="auth-error" role="alert">
                                {fieldErrors.displayName ?? ""}
                            </p>
                        </div>

                        <div className="container">
                            <p className="auth-note">
                                By claiming a link you agree to the Terms of Service and the Privacy Policy.
                            </p>
                        </div>
                        <div className="container">
                            <p className="auth-error" role="alert">
                                {formError}
                            </p>
                        </div>
                        <div className="container">
                            <button className="auth-btn auth-btn-ink" type="submit" disabled={pending}>
                                {pending ? <span className="auth-spin" aria-hidden="true" /> : null}
                                {pending ? "Claiming" : "Claim link"}
                            </button>
                        </div>
                    </form>
                </div>
            </section>
        </AuthShell>
    );
}
