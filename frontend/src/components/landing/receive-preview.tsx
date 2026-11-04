// What you receive: a heading and one line saying this is the same note as it arrives in your
// inbox, then one example card drawn like a drop in the inbox: the same message as the send
// preview, the place and its age, a small drawn map with the red pin, and a photo behind a blur
// that opens on tap. There is no sender on it, as there is none in Drop. The map is a static
// drawing, not a live map. The card is thrown in as it enters the view.
import { MapPin } from "@phosphor-icons/react";
import { ExamplePhoto } from "@/components/landing/example-photo";
import { EXAMPLE_MESSAGE } from "@/components/landing/send-preview";
import { useReveal } from "@/hooks/landing/use-reveal";

// a few streets around the rounded area, with the pin in the middle
function ExampleMap() {
    return (
        <svg className="preview-map-art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <rect className="map-block" x="18" y="14" width="96" height="62" rx="6" />
            <rect className="map-block" x="138" y="14" width="70" height="62" rx="6" />
            <rect className="map-park" x="232" y="14" width="76" height="62" rx="6" />
            <rect className="map-block" x="18" y="100" width="56" height="86" rx="6" />
            <rect className="map-block" x="98" y="100" width="110" height="86" rx="6" />
            <rect className="map-block" x="232" y="100" width="76" height="86" rx="6" />
            <path className="map-road" d="M0 88H320M126 0V200M220 0V200M86 88V200" />
            <path className="map-road-line" d="M0 88H320M126 0V200" />
            <circle className="map-area" cx="160" cy="96" r="46" />
            <path className="map-pin" d="M160 104C156 95 148 88 148 80A12 12 0 1 1 172 80C172 88 164 95 160 104Z" />
            <circle className="map-pin-dot" cx="160" cy="80" r="4.5" />
        </svg>
    );
}

export function ReceivePreview() {
    const introRef = useReveal<HTMLDivElement>();
    const cardRef = useReveal<HTMLDivElement>();

    return (
        <section id="receive" className="section preview" aria-labelledby="receive-title">
            {/* heading and line */}
            <div className="sub-section" ref={introRef}>
                <div className="placement landing-intro">
                    <div className="container">
                        <h2 id="receive-title" className="landing-heading landing-backed">
                            What you receive
                        </h2>
                    </div>
                    <div className="container">
                        <p className="landing-lead landing-backed">The same note, as it arrives in your inbox.</p>
                    </div>
                </div>
            </div>

            {/* example inbox card */}
            <div className="sub-section" ref={cardRef} data-reveal="own">
                <div className="placement preview-place">
                    <div className="container preview-slot">
                        <article
                            className="landing-card preview-card throw"
                            aria-label="Example of a note in the inbox"
                        >
                            <span className="preview-tag">Example</span>
                            <p className="preview-message">{EXAMPLE_MESSAGE}</p>
                            <p className="preview-meta">
                                <span className="preview-badge">
                                    <MapPin className="preview-pin" weight="fill" aria-hidden="true" />
                                    Near Session Road
                                </span>
                                <span className="preview-ago">a few minutes ago</span>
                            </p>
                            <div className="preview-media">
                                <div className="preview-map">
                                    <ExampleMap />
                                </div>
                                <div className="preview-photo-slot">
                                    <ExamplePhoto />
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
            </div>
        </section>
    );
}
