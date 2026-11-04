// The landing page on the marble bath at full strength. The first screen holds the headline and
// the claim field, then How it works, an example of writing a note, the statement cards, the
// privacy facts, the same note as it arrives in the inbox, the common questions and the footer
// with its town drawing. Text on the marble sits on cards or a soft paper backing. Motion is CSS
// only: fades, cards thrown onto the page and the footer's falling pins; under reduced motion
// everything simply shows. The page is always shown in light mode.
import { createFileRoute } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingHero } from "@/components/landing/landing-hero";
import { PrivacyFacts } from "@/components/landing/privacy-facts";
import { Questions } from "@/components/landing/questions";
import { ReceivePreview } from "@/components/landing/receive-preview";
import { SendPreview } from "@/components/landing/send-preview";
import { SiteFooter } from "@/components/landing/site-footer";
import { StatementHand } from "@/components/landing/statement-hand";
import { MarbleBackground } from "@/components/marble/marble-background";
import "@/styles/landing.css";

export const Route = createFileRoute("/")({
    component: LandingPage,
});

function LandingPage() {
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

    return (
        <div className="landing">
            <div className="landing-bath">
                <MarbleBackground intensity="hero" />
            </div>

            <main className="landing-layer">
                <LandingHero />

                {/* one white sheet under every section after the first screen */}
                <div className="landing-sheet">
                    <HowItWorks />
                    <SendPreview />
                    <StatementHand />
                    <PrivacyFacts />
                    <ReceivePreview />
                    <Questions />
                </div>
            </main>

            <div className="landing-layer">
                <SiteFooter />
            </div>
        </div>
    );
}
