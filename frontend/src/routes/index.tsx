// Placeholder home page. Confirms Tailwind, shadcn (Radix) and Phosphor are wired
// up; it is replaced by the real landing page in a later module.
import { createFileRoute } from "@tanstack/react-router";
import { MapPin } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
    component: HomePage,
});

function HomePage() {
    return (
        <main className="flex min-h-svh flex-col items-center justify-center gap-4">
            <MapPin size={32} weight="fill" />
            <h1 className="text-2xl font-semibold">Drop</h1>
            <Button>Coming soon</Button>
        </main>
    );
}
