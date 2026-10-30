// Main navigation for the signed-in app: Inbox, Map, My link and Settings. On phones it is a
// glass tab bar at the bottom, on tablets an icon rail on the left, and from laptops a
// labelled rail with the logo on top and the owner's link card at its foot. A red bead sits
// under the current tab and springs to the next one, with a slower second bead melting
// behind it through the goo filter; under reduced motion it moves without travel. The Inbox
// tab carries the unread count from the shared inbox store, so it needs no extra request.
import { Link, useLocation } from "@tanstack/react-router";
import { Copy, GearSix, LinkSimple, MapTrifold, Tray, type Icon } from "@phosphor-icons/react";
import { useSyncExternalStore, type CSSProperties } from "react";
import { Goo, GooFilter } from "@/components/goo/goo-filter";
import { getSnapshot, subscribe } from "@/hooks/drops/inbox-store";
import { useLinkShare } from "@/hooks/profiles/use-link-share";
import { useOwnLink } from "@/hooks/profiles/use-own-link";
import { sampleSpring } from "@/lib/motion/easings";
import { motionDefaults } from "@/lib/motion/tokens";

type Tab = { label: string; to: "/inbox" | "/map" | "/my-link" | "/settings"; icon: Icon };

const TABS: Tab[] = [
    { label: "Inbox", to: "/inbox", icon: Tray },
    { label: "Map", to: "/map", icon: MapTrifold },
    { label: "My link", to: "/my-link", icon: LinkSimple },
    { label: "Settings", to: "/settings", icon: GearSix },
];

const GOO_ID = "app-nav-goo";
const COUNT_CAP = 9;
const BEAD_SPRING = sampleSpring(motionDefaults.tabSpring);

function readUnread() {
    return getSnapshot().unreadCount;
}

// the tab that owns the current address, or -1 for none
function tabIndex(pathname: string) {
    return TABS.findIndex((tab) => pathname === tab.to || pathname.startsWith(`${tab.to}/`));
}

function countText(count: number) {
    return count > COUNT_CAP ? `${COUNT_CAP}+` : String(count);
}

// the owner's link with a copy button, shown at the rail's foot from laptops up
function LinkFoot() {
    const own = useOwnLink();
    const share = useLinkShare(own.link);

    if (!own.link) {
        return null;
    }

    return (
        // link card
        <div className="placement app-nav-foot">
            <div className="container">
                <p className="app-foot-label">Your link</p>
            </div>
            <div className="container">
                <p className="app-foot-link">{own.link}</p>
            </div>
            <div className="container">
                <button
                    className="auth-btn auth-btn-paper app-foot-copy"
                    type="button"
                    disabled={share.busy}
                    onClick={() => {
                        void share.copy();
                    }}
                >
                    <Copy weight="bold" aria-hidden="true" />
                    Copy
                </button>
            </div>
            <div className="container">
                <p className="auth-status" role="status">
                    {share.message}
                </p>
            </div>
        </div>
    );
}

export function AppNav() {
    const pathname = useLocation({ select: (location) => location.pathname });
    const unread = useSyncExternalStore(subscribe, readUnread);
    const index = tabIndex(pathname);
    const showCount = unread !== null && unread > 0;

    const beadStyle = {
        "--nav-index": index,
        "--app-bead-dur": `${BEAD_SPRING.duration}ms`,
        "--app-bead-ease": BEAD_SPRING.easing,
    } as CSSProperties;

    return (
        <nav className="section app-nav" aria-label="Main">
            {/* glass bar */}
            <div className="sub-section app-nav-bar">
                {/* logo */}
                <div className="placement app-nav-logo">
                    <div className="container">
                        <img className="app-logo app-logo-light" src="/brand/logo.svg" alt="Drop" />
                        <img className="app-logo app-logo-dark" src="/brand/logo-dark.svg" alt="Drop" />
                    </div>
                </div>

                {/* tabs */}
                <div className="placement app-nav-tabs">
                    <div className="container app-nav-beads" aria-hidden="true" data-on={index >= 0} style={beadStyle}>
                        <GooFilter id={GOO_ID} />
                        <Goo id={GOO_ID} className="app-nav-goo">
                            <span className="app-bead app-bead-trail" />
                            <span className="app-bead app-bead-lead" />
                        </Goo>
                    </div>
                    <ul className="container app-nav-list">
                        {TABS.map((tab) => {
                            const counted = tab.to === "/inbox" && showCount;
                            const TabIcon = tab.icon;

                            return (
                                <li key={tab.to} className="app-nav-item">
                                    <Link
                                        className="app-tab"
                                        to={tab.to}
                                        activeOptions={{ exact: false, includeSearch: false }}
                                        aria-label={counted ? `${tab.label}, ${unread} unread` : undefined}
                                    >
                                        {({ isActive }) => (
                                            <>
                                                <span className="app-tab-icon">
                                                    <TabIcon weight={isActive ? "fill" : "bold"} aria-hidden="true" />
                                                    {counted ? (
                                                        <span className="app-tab-count" aria-hidden="true">
                                                            {countText(unread)}
                                                        </span>
                                                    ) : null}
                                                </span>
                                                <span className="app-tab-label">{tab.label}</span>
                                            </>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <LinkFoot />
            </div>
        </nav>
    );
}
