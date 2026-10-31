// Layout for the signed-in app: every page under it gets the shell with the nav. Signed out
// goes to sign-in before anything renders. The owner's profile loads once here and is shared
// with the pages below; no profile yet goes to claim, and an ended session to sign-in. The
// shell shows at once while the profile loads. The guard only spares a trip; the server checks
// the session on every request. A preload (a link hovered or focused) skips the guard, since
// the real navigation runs it anyway.
import { Outlet, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { OwnLinkContext } from "@/hooks/profiles/use-own-link";
import { useOwnProfile } from "@/hooks/profiles/use-own-profile";
import { getSession } from "@/lib/auth/client";

export const Route = createFileRoute("/_app")({
    beforeLoad: async ({ preload }) => {
        if (preload) {
            return;
        }

        if (!(await getSession())) {
            throw redirect({ to: "/sign-in" });
        }
    },
    component: AppLayout,
});

function AppLayout() {
    const navigate = useNavigate();
    const own = useOwnProfile();

    // no profile yet goes to claim; an ended session goes to sign-in
    useEffect(() => {
        if (own.status === "missing") {
            void navigate({ to: "/claim", replace: true });
        } else if (own.status === "signed-out") {
            void navigate({ to: "/sign-in", replace: true });
        }
    }, [own.status, navigate]);

    return (
        <OwnLinkContext value={own}>
            <AppShell>
                <Outlet />
            </AppShell>
        </OwnLinkContext>
    );
}
