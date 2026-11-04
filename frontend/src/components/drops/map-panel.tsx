// The list beside the map. On phones and tablets it rises over the map when a place is chosen,
// showing that place's drops; from laptops it stays docked beside the rail and lists every drop
// that matches the filter until a place is chosen. It is not a dialog: the map stays usable
// behind it. Its heading takes focus when it opens, and Close hands focus back to the page.
// Each card opens the drop with only the filter and the statement in the address. When the
// docked list is folded or unfolded it slides, and tells the page once the slide has ended.
import { X } from "@phosphor-icons/react";
import type { AnimationEvent, RefObject } from "react";
import { InboxCard } from "@/components/drops/inbox-card";
import type { InboxItem } from "@/lib/drops/model";

type MapPanelProps = {
    title: string;
    count: number;
    items: InboxItem[];
    search: { filter?: "unread" | "photos"; statement?: string };
    closable: boolean;
    motion: "entering" | "leaving" | null;
    onMotionEnd: () => void;
    onClose: () => void;
    headingRef: RefObject<HTMLHeadingElement | null>;
};

export function MapPanel({
    title,
    count,
    items,
    search,
    closable,
    motion,
    onMotionEnd,
    onClose,
    headingRef,
}: MapPanelProps) {
    // only the panel's own slide counts, not an animation inside it
    function handleAnimationEnd(event: AnimationEvent<HTMLElement>) {
        if (motion !== null && event.target === event.currentTarget) {
            onMotionEnd();
        }
    }

    return (
        <aside
            id="map-list"
            className="section map-panel"
            role="region"
            aria-labelledby="map-panel-title"
            data-motion={motion ?? undefined}
            onAnimationEnd={handleAnimationEnd}
        >
            {/* heading row */}
            <div className="sub-section map-panel-head">
                <div className="placement map-panel-handle" aria-hidden="true">
                    <div className="container">
                        <span className="map-panel-grip" />
                    </div>
                </div>
                <div className="placement map-panel-title-row">
                    <div className="container map-panel-title-box">
                        <h2 id="map-panel-title" className="map-panel-title" ref={headingRef} tabIndex={-1}>
                            {title}
                        </h2>
                    </div>
                    <div className="container">
                        <span className="map-panel-count">{count === 1 ? "1 drop" : `${count} drops`}</span>
                    </div>
                    {closable ? (
                        <div className="container">
                            <button className="map-panel-close" type="button" aria-label="Close" onClick={onClose}>
                                <X weight="bold" aria-hidden="true" />
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* cards */}
            <div className="sub-section map-panel-body">
                <ul className="placement inbox-cards">
                    {items.map((item) => (
                        <li key={item.id} className="container">
                            <InboxCard item={item} search={search} />
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
}
