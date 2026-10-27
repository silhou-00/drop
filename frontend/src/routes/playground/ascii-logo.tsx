// Dev-only playground page for the animated ASCII logo. Shows the logo on its own so
// its grid, colours, melt and idle values can be tuned in the tweak panel. Outside the
// dev server the route answers "not found".
import { createFileRoute, notFound } from "@tanstack/react-router";
import { AsciiLogo } from "@/components/ascii-logo/ascii-logo";

export const Route = createFileRoute("/playground/ascii-logo")({
    beforeLoad: () => {
        if (!import.meta.env.DEV) {
            throw notFound();
        }
    },
    component: AsciiLogoPlayground,
});

function AsciiLogoPlayground() {
    return (
        <main>
            {/* logo section */}
            <section className="section">
                {/* heading row */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <h1 className="text-heading font-semibold">ASCII logo</h1>
                        </div>
                    </div>
                    <div className="placement">
                        <div className="container">
                            <p className="text-body text-muted-foreground">
                                Hover to melt the letters, press to send a ripple.
                            </p>
                        </div>
                    </div>
                </div>

                {/* logo canvas */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container w-full">
                            <AsciiLogo />
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
