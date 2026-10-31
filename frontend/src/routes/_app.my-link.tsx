// The My link page: the owner's public link with Copy and Share and a preview of the story
// image made from it, so the link can go into a story or a bio from anywhere in the app. On
// phones the logo sits above the heading, since there is no rail to carry it.
import { createFileRoute } from "@tanstack/react-router";
import { LinkCard } from "@/components/profiles/link-card";
import "@/styles/my-link.css";

export const Route = createFileRoute("/_app/my-link")({
    component: MyLinkPage,
});

function MyLinkPage() {
    return (
        <div className="app-sheet">
            {/* heading section */}
            <section className="section" aria-labelledby="my-link-title">
                {/* logo and heading */}
                <div className="sub-section">
                    <div className="placement app-mobile-logo">
                        <div className="container">
                            <img className="app-logo app-logo-light" src="/brand/logo.svg" alt="Drop" />
                            <img className="app-logo app-logo-dark" src="/brand/logo-dark.svg" alt="Drop" />
                        </div>
                    </div>
                    <div className="placement">
                        <div className="container">
                            <h1 id="my-link-title" className="app-title">
                                My link
                            </h1>
                        </div>
                    </div>
                </div>
            </section>

            {/* link section */}
            <section className="section mylink-section" aria-label="Your link">
                <LinkCard />
            </section>
        </div>
    );
}
