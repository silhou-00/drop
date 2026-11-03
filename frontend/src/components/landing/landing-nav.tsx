// The landing's nav: a slim glass bar with the logo, "Sign in" and "Claim your link", over a
// soft blur strip so copy scrolling under it stays out of the way. On hover the button labels
// roll their letters, in CSS only, and not at all under reduced motion; screen readers get the
// plain label. The logo scrolls back to the top through the landing's smooth scroller.
import { type CSSProperties, type MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useLanding } from "@/hooks/landing/use-scroll-timeline";

// a label whose letters roll up on hover; each letter carries its own copy underneath
function RollText({ text }: { text: string }) {
    return (
        <>
            <span className="roll" aria-hidden="true">
                {Array.from(text).map((letter, k) => {
                    const shown = letter === " " ? " " : letter;

                    return (
                        <span className="rl" data-l={shown} style={{ "--i": k } as CSSProperties} key={k}>
                            {shown}
                        </span>
                    );
                })}
            </span>
            <span className="sr-only">{text}</span>
        </>
    );
}

export function LandingNav() {
    const { openClaim, scrollToTarget } = useLanding();

    function handleHome(event: MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        scrollToTarget("#top");
    }

    function handleClaim(event: MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        openClaim(event.currentTarget);
    }

    return (
        <header className="section nav-band">
            {/* glass bar */}
            <div className="sub-section">
                {/* logo and actions */}
                <div className="placement">
                    <div className="container">
                        <a className="home" href="#top" aria-label="Drop home" onClick={handleHome}>
                            <img className="logo" src="/brand/logo.svg" alt="Drop" />
                        </a>
                    </div>
                    <div className="row">
                        <div className="container">
                            <Link className="btn btn-ghost" to="/sign-in">
                                <RollText text="Sign in" />
                            </Link>
                        </div>
                        <div className="container nav-claim">
                            <a className="btn btn-ink" href="#claim-band" onClick={handleClaim}>
                                <RollText text="Claim your link" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
