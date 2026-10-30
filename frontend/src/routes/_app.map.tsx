// The map page. A placeholder for now: it holds the heading and a line saying the map of
// drops is on its way.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/map")({
    component: MapPage,
});

function MapPage() {
    return (
        <div className="app-sheet">
            {/* map section */}
            <section className="section" aria-labelledby="map-title">
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <h1 id="map-title" className="app-title">
                                Map
                            </h1>
                        </div>
                    </div>
                    <div className="placement">
                        <div className="container">
                            <p className="auth-lede">A map of where your drops came from is coming soon.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
