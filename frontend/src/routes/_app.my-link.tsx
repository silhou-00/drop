// The My link page: the owner's public link with Copy and Share, so it can go into a story or
// a bio from anywhere in the app.
import { createFileRoute } from "@tanstack/react-router";
import { LinkCard } from "@/components/profiles/link-card";

export const Route = createFileRoute("/_app/my-link")({
    component: MyLinkPage,
});

function MyLinkPage() {
    return (
        <div className="app-sheet">
            {/* link section */}
            <section className="section" aria-labelledby="my-link-title">
                {/* heading */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <h1 id="my-link-title" className="app-title">
                                My link
                            </h1>
                        </div>
                    </div>
                </div>

                <LinkCard />
            </section>
        </div>
    );
}
