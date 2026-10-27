// Root route. Every page renders inside this layout's outlet.
import { Outlet, createRootRoute } from "@tanstack/react-router";

export const Route = createRootRoute({
    component: () => <Outlet />,
});
