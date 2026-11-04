// The landing's first screen: a slim top row with the logo and "Sign in", then the headline,
// one line on what Drop does and the claim field. The name is checked as it is typed, with the
// server's own rule and then for availability. Continue takes a free name on to sign-in, where
// it is carried through to the claim page, with a lock so a double click navigates once.
// Nothing is reserved here; the claim page checks the name again.
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useUsernameCheck, type UsernameCheckState } from "@/hooks/profiles/use-username-check";
import { USERNAME_INVALID_MESSAGE, USERNAME_MAX } from "@/lib/profiles/model";

const CHECKING_MESSAGE = "Checking the name";
const FREE_MESSAGE = "That name is free.";

// a name can go on when it is free, or when the check could not run; claim checks again
function canContinue(check: UsernameCheckState) {
    return check.status === "available" || (check.status === "idle" && check.username !== "");
}

function statusMessage(check: UsernameCheckState) {
    if (check.status === "checking") {
        return CHECKING_MESSAGE;
    }

    if (check.status === "available") {
        return FREE_MESSAGE;
    }

    return "";
}

function errorMessage(check: UsernameCheckState, emptyTried: boolean) {
    if (emptyTried) {
        return USERNAME_INVALID_MESSAGE;
    }

    if (check.status === "invalid" || check.status === "taken" || check.status === "idle") {
        return check.message;
    }

    return "";
}

export function LandingHero() {
    const navigate = useNavigate();
    const lockRef = useRef(false);
    const [name, setName] = useState("");
    const [waiting, setWaiting] = useState(false);
    const [emptyTried, setEmptyTried] = useState(false);
    const check = useUsernameCheck(name);
    const error = errorMessage(check, emptyTried);

    // a submit goes on once the check allows it; a taken or invalid name waits for an edit
    useEffect(() => {
        if (!waiting || lockRef.current || !canContinue(check)) {
            return;
        }

        lockRef.current = true;
        void navigate({ to: "/sign-in", search: { username: check.username } });
    }, [waiting, check, navigate]);

    // on to sign-in, with a lock so a double click navigates once
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (lockRef.current) {
            return;
        }

        if (name.trim() === "") {
            setEmptyTried(true);

            return;
        }

        setWaiting(true);
    }

    return (
        <section id="top" className="section hero" aria-labelledby="hero-title">
            {/* top row */}
            <header className="sub-section">
                <div className="placement hero-top">
                    <div className="container">
                        <img className="landing-logo" src="/brand/logo.svg" alt="Drop" />
                    </div>
                    <div className="container">
                        <Link className="landing-btn landing-btn-ghost" to="/sign-in">
                            Sign in
                        </Link>
                    </div>
                </div>
            </header>

            {/* headline, lede and claim field */}
            <div className="sub-section hero-centre">
                <div className="placement hero-copy">
                    <div className="container">
                        <h1 id="hero-title" className="hero-title">
                            Anonymous notes from real places
                        </h1>
                    </div>
                    <div className="container">
                        <p className="hero-lede">
                            Share your link. Friends send you anonymous notes from where they are, and you see the
                            place.
                        </p>
                    </div>
                </div>

                <form className="placement claim-form" noValidate onSubmit={handleSubmit}>
                    <div className="container claim-grow">
                        <div className="claim-field" data-invalid={error ? "true" : undefined}>
                            <span className="claim-prefix" aria-hidden="true">
                                {window.location.host}/
                            </span>
                            <label className="sr-only" htmlFor="hero-name">
                                Link name
                            </label>
                            <input
                                id="hero-name"
                                name="name"
                                autoComplete="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="yourname"
                                maxLength={USERNAME_MAX}
                                value={name}
                                aria-invalid={error ? true : undefined}
                                aria-describedby="hero-name-error hero-name-status"
                                onChange={(event) => {
                                    setName(event.target.value);
                                    setWaiting(false);
                                    setEmptyTried(false);
                                }}
                            />
                        </div>
                    </div>
                    <div className="container">
                        <button className="landing-btn landing-btn-ink" type="submit">
                            Claim your link
                        </button>
                    </div>
                </form>

                <div className="placement claim-notes">
                    <div className="container">
                        <p id="hero-name-error" className="claim-error" role="alert">
                            {error}
                        </p>
                    </div>
                    <div className="container">
                        <p id="hero-name-status" className="claim-status" role="status">
                            {statusMessage(check)}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
