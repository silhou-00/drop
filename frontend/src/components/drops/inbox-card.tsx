// One drop in the inbox list. The whole card links to the drop's page. It shows an unread dot,
// the place name (or "Place unknown"), a relative time with the full time in a time element, the
// start of the message clamped to a few lines, and badges for the GPS place and for a photo.
// The message is rendered as text only.
import { Link } from "@tanstack/react-router";
import { Image, MapPin } from "@phosphor-icons/react";
import { fullTime, relativeTime } from "@/lib/drops/helper";
import type { InboxItem } from "@/lib/drops/model";

export function InboxCard({ item }: { item: InboxItem }) {
    const place = item.location.name ?? "Place unknown";
    const full = fullTime(item.created_at);

    return (
        <Link
            className="inbox-card"
            to="/inbox/$id"
            params={{ id: item.id }}
            data-unread={item.is_read ? undefined : "true"}
        >
            {/* place and time */}
            <span className="inbox-card-top">
                {item.is_read ? null : (
                    <span className="inbox-dot">
                        <span className="inbox-sr">Unread. </span>
                    </span>
                )}
                <span className="inbox-card-place">{place}</span>
                <time className="inbox-card-time" dateTime={item.created_at} title={full}>
                    {relativeTime(item.created_at)}
                </time>
            </span>

            {/* message */}
            <span className="inbox-card-message">{item.message}</span>

            {/* badges */}
            <span className="inbox-badges">
                <span className="inbox-badge">
                    <MapPin weight="fill" aria-hidden="true" />
                    GPS place
                </span>
                {item.has_photo ? (
                    <span className="inbox-badge">
                        <Image weight="fill" aria-hidden="true" />
                        Photo
                    </span>
                ) : null}
            </span>
        </Link>
    );
}
