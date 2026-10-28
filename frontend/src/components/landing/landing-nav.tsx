// The landing's floating nav: the logo, "Sign in" and "Claim your link". The glass pill darkens
// while it floats over the dark ground and turns solid paper once the bath has lifted off for
// the claim. In-page links scroll through the landing's smooth scroller, so they glide like the
// wheel; "Sign in" opens the sign-in page.
import { useRef, type MouseEvent } from "react";
import { Link } from "@tanstack/react-router";
import { groundAt } from "@/lib/landing/timeline";
import { useLanding, useTimelineFrame } from "@/hooks/landing/use-scroll-timeline";

export function LandingNav() {
    const { openClaim, scrollToTarget } = useLanding();
    const navRef = useRef<HTMLElement>(null);
    const lastRef = useRef({ dark: false, solid: false });

    useTimelineFrame(({ L, S, changed }) => {
        const nav = navRef.current;
        const last = lastRef.current;

        if (!nav || !changed) {
            return;
        }

        const dark = groundAt(S.y, L) === "dark";
        const solid = S.p7 > 0.55;

        if (dark !== last.dark) {
            last.dark = dark;
            nav.classList.toggle("over-dark", dark);
        }

        if (solid !== last.solid) {
            last.solid = solid;
            nav.classList.toggle("solid", solid);
        }
    });

    // in-page links
    function handleAnchor(event: MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        scrollToTarget(event.currentTarget.hash);
    }

    function handleClaim(event: MouseEvent<HTMLAnchorElement>) {
        event.preventDefault();
        openClaim(event.currentTarget);
    }

    return (
        <header className="section nav-band" ref={navRef}>
            {/* pill */}
            <div className="sub-section">
                {/* logo and actions */}
                <div className="placement">
                    <div className="container">
                        <a className="home" href="#top" aria-label="Drop home" onClick={handleAnchor}>
                            <img className="logo" src="/brand/logo.svg" alt="Drop" />
                        </a>
                    </div>
                    <div className="row">
                        <div className="container">
                            <Link className="btn btn-ghost" to="/sign-in">
                                Sign in
                            </Link>
                        </div>
                        <div className="container nav-claim">
                            <a className="btn btn-ink" href="#claim-band" onClick={handleClaim}>
                                Claim your link
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
