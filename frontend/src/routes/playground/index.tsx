// Dev-only playground index. Lists the pages that show each piece of the design
// foundation on its own. Outside the dev server the route answers "not found".
import { Link, createFileRoute, notFound } from "@tanstack/react-router";

const PAGES = [
    { to: "/playground/ascii-logo", title: "ASCII logo", note: "The animated logo: hover to melt, press to ripple." },
    { to: "/playground/goo", title: "Goo", note: "The gooey filter: drag one blob into another." },
    { to: "/playground/motion", title: "Motion", note: "Every motion token side by side, with replay." },
] as const;

export const Route = createFileRoute("/playground/")({
    beforeLoad: () => {
        if (!import.meta.env.DEV) {
            throw notFound();
        }
    },
    component: PlaygroundIndex,
});

function PlaygroundIndex() {
    return (
        <main>
            {/* heading section */}
            <section className="section">
                {/* title row */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <h1 className="text-heading font-semibold">Playground</h1>
                        </div>
                    </div>
                    <div className="placement">
                        <div className="container">
                            <p className="text-body text-muted-foreground">
                                Dev-only pages for tuning the design foundation with the tweak panel.
                            </p>
                        </div>
                    </div>
                </div>

                {/* page list */}
                <div className="sub-section">
                    {PAGES.map((page) => (
                        <div key={page.to} className="placement">
                            <div className="container">
                                <Link
                                    to={page.to}
                                    className="text-subheading font-medium underline-offset-4 hover:underline"
                                >
                                    {page.title}
                                </Link>
                            </div>
                            <div className="container">
                                <p className="text-caption text-muted-foreground">{page.note}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}
