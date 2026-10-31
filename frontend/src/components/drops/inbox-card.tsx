// One drop in the inbox list. The whole card is one link to the drop's page that keeps the
// current filter and statement in the address, or the search it is given (the map passes only
// those two, so the selected place does not follow the drop). It shows the start of the message clamped to three lines,
// then a badge for the place (left out when the drop has no place name), a badge when there
// is a photo, a short age with the full time in a time element, and a ringed red dot when the
// drop is unread. The open drop's card is marked active by the router. Text only.
import { Link } from "@tanstack/react-router";
import { Image, MapPin } from "@phosphor-icons/react";
import { fullTime, shortAgo } from "@/lib/drops/helper";
import type { InboxItem } from "@/lib/drops/model";

type InboxCardProps = { item: InboxItem; search?: { filter?: "unread" | "photos"; statement?: string } };

export function InboxCard({ item, search }: InboxCardProps) {
    const unread = !item.is_read;

    return (
        <Link
            className="inbox-card"
            to="/inbox/$id"
            params={{ id: item.id }}
            search={search ?? ((prev) => prev)}
            data-unread={unread ? "true" : undefined}
        >
            {unread ? <span className="inbox-sr">Unread. </span> : null}

            {/* message */}
            <span className="inbox-card-message">{item.message}</span>

            {/* place, photo and age */}
            <span className="inbox-card-meta">
                {item.location.name ? (
                    <span className="inbox-badge">
                        <MapPin className="inbox-pin" weight="fill" aria-hidden="true" />
                        {item.location.name}
                    </span>
                ) : null}
                {item.has_photo ? (
                    <span className="inbox-badge">
                        <Image weight="fill" aria-hidden="true" />
                        Photo
                    </span>
                ) : null}
                <span className="inbox-ago">
                    {unread ? <span className="inbox-dot" aria-hidden="true" /> : null}
                    <time dateTime={item.created_at} title={fullTime(item.created_at)}>
                        {shortAgo(item.created_at)}
                    </time>
                </span>
            </span>
        </Link>
    );
}
