// The landing page. One marble bath sits behind the whole page, from the hero to the bottom of
// the footer, and keeps one calm pattern all the way down: the hero's flowing contour lines,
// drifting slowly, thinned behind the copy in view. The three beats after the hero are the
// exception: the bath becomes a map window, dives in and closes to a lens, with its pins, ring
// and the travelling note in a scene layer above it. One frame loop drives everything: it
// advances Lenis for smooth wheel scrolling, reads the scroll position and hands the state to
// every section, the bath, the scene and the scrollbar. Under reduced motion there is no Lenis
// and no live shader; the still bath and every section's final state show instead. The page is
// always shown in light mode.
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Claim } from "@/components/landing/claim";
import { ClaimIris, type ClaimRequest } from "@/components/landing/claim-iris";
import { DiveBeat, NoteScene } from "@/components/landing/dive-beat";
import { Hero } from "@/components/landing/hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { LensBeat } from "@/components/landing/lens-beat";
import { MarbleBath } from "@/components/landing/marble-bath";
import { Redaction } from "@/components/landing/redaction";
import { SiteFooter } from "@/components/landing/site-footer";
import { StatementLine } from "@/components/landing/statement-line";
import { WindowBeat, WindowScene } from "@/components/landing/window-beat";
import { YourAnswer } from "@/components/landing/your-answer";
import { ScrollHairline, type HairlineSource } from "@/components/layout/scroll-hairline";
import { useLenis } from "@/hooks/landing/use-lenis";
import { LandingContext, useScrollTimeline, type LandingContextValue } from "@/hooks/landing/use-scroll-timeline";
import { groundAt } from "@/lib/landing/timeline";
import { landingFlatDefaults, unflattenLandingTokens } from "@/lib/landing/tokens";
import { useTweaks } from "@/lib/tweaks/use-tweaks";
import "@/styles/landing.css";

export const Route = createFileRoute("/")({
    component: LandingPage,
});

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
    const query = window.matchMedia(REDUCED_QUERY);

    query.addEventListener("change", onChange);

    return () => {
        query.removeEventListener("change", onChange);
    };
}

function readReduced() {
    return window.matchMedia(REDUCED_QUERY).matches;
}

function readReducedOnServer() {
    return false;
}

function LandingPage() {
    const flat = useTweaks("Landing", landingFlatDefaults);
    const tokens = useMemo(() => unflattenLandingTokens(flat), [flat]);
    const reduced = useSyncExternalStore(subscribeReduced, readReduced, readReducedOnServer);
    const lenis = useLenis(!reduced);
    const rootRef = useRef<HTMLDivElement>(null);
    const { subscribe, invalidate, runtime } = useScrollTimeline({ rootRef, lenis, reduced, tokens });
    const [claim, setClaim] = useState<ClaimRequest | null>(null);

    // the landing is designed for the light palette only, set before the first paint
    useLayoutEffect(() => {
        const root = document.documentElement;
        const previous = root.getAttribute("data-theme");

        root.setAttribute("data-theme", "light");

        return () => {
            if (previous === null) {
                root.removeAttribute("data-theme");
            } else {
                root.setAttribute("data-theme", previous);
            }
        };
    }, []);

    // the page shows once the first frame has placed it
    useEffect(() => {
        const stop = subscribe(() => {
            rootRef.current?.classList.add("ready");
            stop();
        });

        return stop;
    }, [subscribe]);

    // one claim step at a time, so a double click opens it once
    const openClaim = useCallback((opener: HTMLElement, name = "") => {
        setClaim((current) => current ?? { opener, name });
    }, []);

    // in-page links glide through Lenis when there is one
    const scrollToTarget = useCallback(
        (hash: string) => {
            const target = hash === "#top" ? null : rootRef.current?.querySelector<HTMLElement>(hash);
            const top = target ? target.getBoundingClientRect().top + window.scrollY : 0;

            if (lenis) {
                lenis.scrollTo(top);
            } else {
                window.scrollTo({ top, behavior: "auto" });
            }
        },
        [lenis],
    );

    // the scrollbar reads the same frames as the page
    const hairlineSource = useCallback<HairlineSource>(
        (listener) =>
            subscribe(({ L, S, changed }) => {
                if (changed) {
                    listener({ y: S.y, darkAt: (viewportY) => groundAt(S.y + viewportY, L) === "dark" });
                }
            }),
        [subscribe],
    );

    const context = useMemo<LandingContextValue>(
        () => ({
            subscribe,
            invalidate,
            runtime,
            lenis,
            reduced,
            tokens,
            openClaim,
            scrollToTarget,
        }),
        [subscribe, invalidate, runtime, lenis, reduced, tokens, openClaim, scrollToTarget],
    );

    const rootClass = ["landing", reduced ? "rm" : "", claim ? "claiming" : ""].filter(Boolean).join(" ");

    return (
        <LandingContext.Provider value={context}>
            <div className={rootClass} ref={rootRef}>
                <MarbleBath />

                {/* scene: pins, ring and the travelling note over the bath */}
                <section className="section scene" aria-hidden="true">
                    <div className="sub-section">
                        <WindowScene />
                        <NoteScene />
                    </div>
                </section>

                <LandingNav />

                <main>
                    <Hero />
                    <WindowBeat />
                    <DiveBeat />
                    <LensBeat />
                    <StatementLine />
                    <YourAnswer />
                    <Redaction />
                    <Claim />
                    <SiteFooter />
                </main>

                {claim ? <ClaimIris request={claim} onClosed={() => setClaim(null)} /> : null}
                <ScrollHairline lenis={lenis} source={hairlineSource} />
            </div>
        </LandingContext.Provider>
    );
}
