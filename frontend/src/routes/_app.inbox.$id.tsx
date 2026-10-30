// One drop, opened from the inbox: alone on phones and tablets, in the reading pane beside the
// list from laptops up. The view is keyed by the drop id, so moving to another drop starts it
// fresh: the photo blurs again, the map recentres and any open confirm or share panel closes.
import { createFileRoute } from "@tanstack/react-router";
import { DropView } from "@/components/drops/drop-view";
import { useWide } from "@/hooks/layout/use-wide";

export const Route = createFileRoute("/_app/inbox/$id")({
    component: DropPage,
});

function DropPage() {
    const { id } = Route.useParams();
    const wide = useWide();

    return <DropView key={id} id={id} wide={wide} />;
}
