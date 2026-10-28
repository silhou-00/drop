// Root route. Every page renders inside this layout's outlet. On the dev server it
// also loads the breakpoint badge; the import sits behind the dev flag, so the
// production build drops it entirely.
import { Suspense, lazy } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";

const BreakpointIndicator = import.meta.env.DEV
    ? lazy(() =>
          import("@/components/dev/breakpoint-indicator").then((module) => ({ default: module.BreakpointIndicator })),
      )
    : null;

export const Route = createRootRoute({
    component: RootLayout,
});

function RootLayout() {
    return (
        <>
            <Outlet />
            {BreakpointIndicator ? (
                <Suspense fallback={null}>
                    <BreakpointIndicator />
                </Suspense>
            ) : null}
        </>
    );
}
