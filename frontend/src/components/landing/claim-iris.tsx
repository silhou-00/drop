// The claim step. It opens as an iris from the red pin in the nav logo, covers the page and
// closes back into the pin. While it is open the page behind it stops scrolling, and Escape or
// Back closes it and returns focus to whatever opened it. Sign-up arrives with the auth module,
// so a valid name is not sent anywhere: the step checks the name with the same rule the server
// will use and says that sign-up opens soon. It never pretends a link was created.
import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLanding } from "@/hooks/landing/use-scroll-timeline";

export type ClaimRequest = { opener: HTMLElement; name: string };

type ClaimIrisProps = { request: ClaimRequest; onClosed: () => void };

const USERNAME_PATTERN = /^[a-z0-9_.]{3,30}$/;
const USERNAME_MESSAGE = "Use 3 to 30 letters, numbers, dots or underscores.";
const SOON_MESSAGE = "Sign up opens soon. Your name is not saved yet.";
const SUBMIT_LOCK_MS = 600;

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
    const dialogRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const lockRef = useRef(false);
    const closingRef = useRef(false);
    const [name, setName] = useState(request.name);
    const [message, setMessage] = useState("");

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

    // name check, with a lock so a double click sends one submit
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (lockRef.current) {
            return;
        }

        lockRef.current = true;
        window.setTimeout(() => {
            lockRef.current = false;
        }, SUBMIT_LOCK_MS);

        setMessage(USERNAME_PATTERN.test(name.trim().toLowerCase()) ? SOON_MESSAGE : USERNAME_MESSAGE);
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
                            <label htmlFor="claim-name">drop.link/</label>
                            <input
                                id="claim-name"
                                name="name"
                                autoComplete="off"
                                placeholder="yourname"
                                maxLength={30}
                                value={name}
                                ref={inputRef}
                                onChange={(event) => {
                                    setName(event.target.value);
                                    setMessage("");
                                }}
                            />
                            <button className="btn btn-ink" type="submit">
                                Continue
                            </button>
                        </form>
                    </div>
                    <div className="container">
                        <p className="claim-msg" role="status">
                            {message}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
