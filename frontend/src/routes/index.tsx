// The landing page (concept A, "The Bath"). One marble bath sits under seven beats: the hero
// drop, the map window, the note that lifts off it, the lens, the phone track, the safety index
// and the claim. One frame loop drives everything: it advances Lenis for smooth wheel
// scrolling, reads the scroll position and hands the state to every beat, the bath, the nav,
// the beat pill and the scrollbar. Under reduced motion there is no Lenis and no live shader;
// the still bath and the final states show instead. The page is always shown in light mode.
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BathPlate } from "@/components/landing/bath-plate";
import { BeatProgress } from "@/components/landing/beat-progress";
import { Claim } from "@/components/landing/claim";
import { ClaimIris, type ClaimRequest } from "@/components/landing/claim-iris";
import { DiveBeat, NoteScene } from "@/components/landing/dive-beat";
import { Hero, HeroScene } from "@/components/landing/hero";
import { KeptQuiet, KeptQuietScene } from "@/components/landing/kept-quiet";
import { LandingNav } from "@/components/landing/landing-nav";
import { LensBeat } from "@/components/landing/lens-beat";
import { PhoneTrack } from "@/components/landing/phone-track";
import { SiteFooter } from "@/components/landing/site-footer";
import { WindowBeat, WindowScene } from "@/components/landing/window-beat";
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

    // the landing is designed for the light palette only
    useEffect(() => {
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

    // the scene layer shows once the first frame has placed it
    useEffect(() => {
        const stop = subscribe(() => {
            rootRef.current?.classList.add("ready");
            stop();
        });

        return stop;
    }, [subscribe]);

    const openClaim = useCallback((opener: HTMLElement, name = "") => {
        setClaim({ opener, name });
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
                <BathPlate />

                {/* scene: objects that ride the bath; the copy says the same */}
                <section className="section scene" aria-hidden="true">
                    {/* scene objects */}
                    <div className="sub-section">
                        <HeroScene />
                        <WindowScene />
                        <NoteScene />
                        <KeptQuietScene />
                    </div>
                </section>

                <LandingNav />

                <main>
                    <Hero />
                    <WindowBeat />
                    <DiveBeat />
                    <LensBeat />
                    <PhoneTrack />
                    <KeptQuiet />
                    <Claim />
                    <SiteFooter />
                </main>

                <BeatProgress />
                {claim ? <ClaimIris request={claim} onClosed={() => setClaim(null)} /> : null}
                <ScrollHairline lenis={lenis} source={hairlineSource} />
            </div>
        </LandingContext.Provider>
    );
}
