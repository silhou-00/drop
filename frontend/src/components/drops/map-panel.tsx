// The list beside the map. On phones and tablets it rises over the map when a place is chosen,
// showing that place's drops; from laptops it stays docked beside the rail and lists every drop
// that matches the filter until a place is chosen. It is not a dialog: the map stays usable
// behind it. Its heading takes focus when it opens, and Close hands focus back to the page.
// Each card opens the drop with only the filter in the address.
import { X } from "@phosphor-icons/react";
import type { RefObject } from "react";
import { InboxCard } from "@/components/drops/inbox-card";
import type { InboxItem } from "@/lib/drops/model";

type MapPanelProps = {
    title: string;
    count: number;
    items: InboxItem[];
    search: { filter?: "unread" | "photos" };
    closable: boolean;
    onClose: () => void;
    headingRef: RefObject<HTMLHeadingElement | null>;
};

export function MapPanel({ title, count, items, search, closable, onClose, headingRef }: MapPanelProps) {
    return (
        <aside id="map-list" className="section map-panel" role="region" aria-labelledby="map-panel-title">
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
