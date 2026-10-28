// Dev-only playground page for the marbled bath. Shows the bath full width with a paper
// card on top so the zone intensities can be judged against real content. Every marble
// token is a slider in the tweak panel's Marble folder, and the Marble preview folder
// switches the zone. Outside the dev server the route answers "not found".
import { createFileRoute, notFound } from "@tanstack/react-router";
import { MarbleBackground } from "@/components/marble/marble-background";
import { MARBLE_ZONES, type MarbleZone } from "@/lib/marble/tokens";
import { useTweaks } from "@/lib/tweaks/use-tweaks";

const previewDefaults = { zone: "chrome" };
const previewSchema = { zone: { options: MARBLE_ZONES } };

export const Route = createFileRoute("/playground/marble")({
    beforeLoad: () => {
        if (!import.meta.env.DEV) {
            throw notFound();
        }
    },
    component: MarblePlayground,
});

function MarblePlayground() {
    const preview = useTweaks("Marble preview", previewDefaults, previewSchema);

    return (
        <main className="relative min-h-svh">
            <MarbleBackground intensity={preview.zone as MarbleZone} />

            {/* heading section, on paper so the bath can be judged against content */}
            <section className="section relative rounded-[22px] bg-paper">
                {/* title and note */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <h1 className="font-display text-heading">Marbled bath</h1>
                        </div>
                    </div>
                    <div className="placement">
                        <div className="container">
                            <p className="text-body text-ink-2">
                                Combed Veins. Switch the zone in Marble preview and tune every value in the Marble
                                folder. Turn on reduced motion to see the still.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
