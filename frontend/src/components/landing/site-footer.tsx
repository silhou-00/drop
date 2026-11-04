// The landing's footer on the town's paper. On the left: the logo, one line about Drop and the
// studio line. On the right: two link columns, Menu (in-page links, sign-in and "Claim your
// link", which scrolls to the first screen and focuses the name field) and Legal (the Terms,
// Privacy and Safety pages). On phones the columns sit under the brand block. At the bottom,
// the town drawing runs the full window width. On phones it keeps a floor height and is
// cropped from the sides, around its centre. Falling pins and drifting paper notes are drawn
// over it in the same box, placed in percent of the drawing, so they crop and scale with it.
// When the band enters the view the pins drop along their trails and the notes drift; under
// reduced motion all of it stays still in its final place. The drawing is decoration only.
import { Link } from "@tanstack/react-router";
import type { CSSProperties, MouseEvent } from "react";
import { useReveal } from "@/hooks/landing/use-reveal";

const ART_W = 1920;
const ART_Y = 180;
const ART_H = 580;
const PIN_BOX = { left: 12, top: 100, width: 24, height: 104 };
const NOTE_BOX = 32;
const FALLING = [
    { x: 310, y: 320 },
    { x: 980, y: 290 },
    { x: 1460, y: 340 },
    { x: 1720, y: 300 },
];
const NOTES = [
    { x: 640, y: 215, rot: -14 },
    { x: 700, y: 245, rot: 8 },
    { x: 1200, y: 205, rot: -6 },
    { x: 1280, y: 235, rot: 16 },
    { x: 1250, y: 265, rot: -20 },
];
const MENU = [
    { label: "How it works", href: "#how-it-works" },
    { label: "Statements", href: "#statements" },
    { label: "Privacy", href: "#privacy" },
];
const LEGAL = [
    { label: "Terms", to: "/terms" },
    { label: "Privacy", to: "/privacy" },
    { label: "Safety", to: "/safety" },
] as const;

// a box in the drawing's own units, as percent of the band
function artBox(x: number, y: number, width: number, height: number, index: number): CSSProperties {
    return {
        left: `${(x / ART_W) * 100}%`,
        top: `${((y - ART_Y) / ART_H) * 100}%`,
        width: `${(width / ART_W) * 100}%`,
        height: `${(height / ART_H) * 100}%`,
        "--art-i": index,
    } as CSSProperties;
}

// back to the first screen, then the name field
function handleClaim(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.getElementById("top")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    document.getElementById("hero-name")?.focus({ preventScroll: true });
}

function TownBand() {
    return (
        <div className="town-band">
            <div className="town-stage">
                <img
                    className="town-img"
                    src="/landing/footer-town.svg"
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    decoding="async"
                />
                {FALLING.map((pin, index) => (
                    <span
                        key={pin.x}
                        className="fall-pin"
                        aria-hidden="true"
                        style={artBox(pin.x - PIN_BOX.left, pin.y - PIN_BOX.top, PIN_BOX.width, PIN_BOX.height, index)}
                    >
                        <svg viewBox="-12 -100 24 104">
                            <line className="fall-trail" x1="0" y1="-100" x2="0" y2="-34" />
                            <g className="fall-head">
                                <path d="M0 0C-4 -9 -10 -13 -10 -16A10 10 0 1 1 10 -16C10 -13 4 -9 0 0Z" />
                                <circle cy="-16" r="3.8" />
                            </g>
                        </svg>
                    </span>
                ))}
                {NOTES.map((note, index) => (
                    <span
                        key={note.x}
                        className="drift-note"
                        aria-hidden="true"
                        style={artBox(note.x - NOTE_BOX / 2, note.y - NOTE_BOX / 2, NOTE_BOX, NOTE_BOX, index)}
                    >
                        <svg viewBox="-16 -16 32 32">
                            <g transform={`rotate(${note.rot})`}>
                                <rect x="-14" y="-9" width="28" height="18" rx="2" />
                                <path d="M-8 -2H8M-8 3H4" />
                            </g>
                        </svg>
                    </span>
                ))}
            </div>
        </div>
    );
}

export function SiteFooter() {
    const townRef = useReveal<HTMLElement>();

    return (
        <footer className="site-foot">
            {/* brand and links */}
            <section className="section foot-main" aria-label="Drop">
                <div className="sub-section foot-top">
                    {/* brand */}
                    <div className="placement foot-brand">
                        <div className="container">
                            <img className="landing-logo" src="/brand/logo.svg" alt="Drop" />
                        </div>
                        <div className="container">
                            <p className="foot-sum">
                                Anonymous notes from real places. Friends drop a note where they are, and you see the
                                place.
                            </p>
                        </div>
                        <div className="container">
                            <p className="foot-copy">Fundr. Studios © 2026</p>
                        </div>
                    </div>

                    {/* menu column */}
                    <nav className="placement foot-col" aria-labelledby="foot-menu">
                        <div className="container">
                            <p id="foot-menu" className="foot-label">
                                Menu
                            </p>
                        </div>
                        {MENU.map((item) => (
                            <div className="container" key={item.href}>
                                <a className="foot-link" href={item.href}>
                                    {item.label}
                                </a>
                            </div>
                        ))}
                        <div className="container">
                            <Link className="foot-link" to="/sign-in">
                                Sign in
                            </Link>
                        </div>
                        <div className="container">
                            <a className="foot-link" href="#top" onClick={handleClaim}>
                                Claim your link
                            </a>
                        </div>
                    </nav>

                    {/* legal column */}
                    <nav className="placement foot-col" aria-labelledby="foot-legal">
                        <div className="container">
                            <p id="foot-legal" className="foot-label">
                                Legal
                            </p>
                        </div>
                        {LEGAL.map((item) => (
                            <div className="container" key={item.to}>
                                <Link className="foot-link" to={item.to}>
                                    {item.label}
                                </Link>
                            </div>
                        ))}
                    </nav>
                </div>
            </section>

            {/* town band */}
            <section className="section foot-town" ref={townRef} data-reveal="own" aria-hidden="true">
                <div className="sub-section">
                    <div className="placement">
                        <div className="container town-slot">
                            <TownBand />
                        </div>
                    </div>
                </div>
            </section>
        </footer>
    );
}
