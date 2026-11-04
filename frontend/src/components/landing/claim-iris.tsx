// The claim step. It opens as an iris from the red pin in the nav logo, covers the page and
// closes back into the pin. While it is open the page behind it stops scrolling, and Escape or
// Back closes it and returns focus to whatever opened it. The name is checked as it is typed,
// with the server's own rule and then for availability. Continue takes a free name on to
// sign-in, where it is carried through to the claim page. Nothing is reserved here.
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLanding } from "@/hooks/landing/use-scroll-timeline";
import { useUsernameCheck, type UsernameCheckState } from "@/hooks/profiles/use-username-check";
import { USERNAME_INVALID_MESSAGE, USERNAME_MAX } from "@/lib/profiles/model";

export type ClaimRequest = { opener: HTMLElement; name: string };

type ClaimIrisProps = { request: ClaimRequest; onClosed: () => void };

const CHECKING_MESSAGE = "Checking the name";
const FREE_MESSAGE = "That name is free.";

// a name can go on when it is free, or when the check could not run; claim checks again
function canContinue(check: UsernameCheckState) {
    return check.status === "available" || (check.status === "idle" && check.username !== "");
}

function checkMessage(check: UsernameCheckState) {
    if (check.status === "checking") {
        return CHECKING_MESSAGE;
    }

    if (check.status === "available") {
        return FREE_MESSAGE;
    }

    return check.message;
}

// the red pin in the logo, where the iris opens and closes
function pinPoint() {
    const logo = document.querySelector(".nav-band .logo");
    const r = logo ? logo.getBoundingClientRect() : new DOMRect(0, 0, 0, 0);

    return [r.left + r.width * 0.125, r.top + r.height * 0.24];
}

// the iris between the pin and the full screen; reduced motion snaps instead
function animateIris(dialog: HTMLElement, open: boolean, reduced: boolean, duration: number) {
    const [x, y] = pinPoint();
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const shut = `circle(0px at ${x}px ${y}px)`;
    const wide = `circle(${radius}px at ${x}px ${y}px)`;

    if (reduced) {
        return dialog.animate([{ opacity: open ? 0 : 1 }, { opacity: open ? 1 : 0 }], {
            duration: 1,
            fill: "forwards",
        });
    }

    return dialog.animate([{ clipPath: open ? shut : wide }, { clipPath: open ? wide : shut }], {
        duration,
        easing: "cubic-bezier(.25,1,.5,1)",
        fill: "forwards",
    });
}

export function ClaimIris({ request, onClosed }: ClaimIrisProps) {
    const { lenis, reduced, tokens } = useLanding();
    const navigate = useNavigate();
    const dialogRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lockRef = useRef(false);
    const closingRef = useRef(false);
    const [name, setName] = useState(request.name);
    const [waiting, setWaiting] = useState(false);
    const [emptyTried, setEmptyTried] = useState(false);
    const check = useUsernameCheck(name);

    // open: the iris grows out of the pin
    useLayoutEffect(() => {
        if (dialogRef.current) {
            animateIris(dialogRef.current, true, reduced, tokens.iris.dur);
        }

        inputRef.current?.focus({ preventScroll: true });
    }, [reduced, tokens.iris.dur]);

    // the page behind stops while the step is open
    useEffect(() => {
        lenis?.stop();

        return () => {
            lenis?.start();
        };
    }, [lenis]);

    useEffect(() => {
        return () => {
            request.opener.focus({ preventScroll: true });
        };
    }, [request]);

    function close() {
        if (closingRef.current) {
            return;
        }

        closingRef.current = true;

        if (!dialogRef.current) {
            onClosed();

            return;
        }

        const animation = animateIris(dialogRef.current, false, reduced, tokens.iris.dur);

        animation.onfinish = () => {
            onClosed();
        };
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Escape") {
            close();
        }
    }

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
        <div
            className="claim-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="claim-title"
            data-lenis-prevent=""
            ref={dialogRef}
            onKeyDown={handleKeyDown}
        >
            {/* claim step */}
            <div className="sub-section">
                {/* logo and back */}
                <div className="placement top">
                    <div className="container">
                        <img className="logo" src="/brand/logo.svg" alt="Drop" />
                    </div>
                    <div className="container">
                        <button className="btn btn-ghost claim-close" type="button" onClick={close}>
                            Back
                        </button>
                    </div>
                </div>

                {/* name field */}
                <div className="placement">
                    <div className="container">
                        <h2 id="claim-title">Claim your link</h2>
                    </div>
                    <div className="container">
                        <p className="lede">Pick the name people will see in your link.</p>
                    </div>
                    <div className="container">
                        <form className="field" onSubmit={handleSubmit}>
                            <label htmlFor="claim-name">{window.location.host}/</label>
                            <input
                                id="claim-name"
                                name="name"
                                autoComplete="off"
                                placeholder="yourname"
                                maxLength={USERNAME_MAX}
                                value={name}
                                ref={inputRef}
                                aria-describedby="claim-msg"
                                onChange={(event) => {
                                    setName(event.target.value);
                                    setWaiting(false);
                                    setEmptyTried(false);
                                }}
                            />
                            <button className="btn btn-ink" type="submit">
                                Continue
                            </button>
                        </form>
                    </div>
                    <div className="container">
                        <p id="claim-msg" className="claim-msg" role="status">
                            {emptyTried ? USERNAME_INVALID_MESSAGE : checkMessage(check)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
