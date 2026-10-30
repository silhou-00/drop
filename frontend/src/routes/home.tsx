// Old home address. The inbox replaced the placeholder home page, so /home only checks for a
// session (signed out goes to sign-in, as before) and then sends everyone on to /inbox, which
// runs its own checks. The server checks the session on every request.
import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth/client";

export const Route = createFileRoute("/home")({
    beforeLoad: async () => {
        if (!(await getSession())) {
            throw redirect({ to: "/sign-in" });
        }

        throw redirect({ to: "/inbox", replace: true });
    },
});
