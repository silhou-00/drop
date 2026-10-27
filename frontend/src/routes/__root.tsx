// Root route. Every page renders inside this layout's outlet. On the dev server it
// also loads the tweak panel and the breakpoint badge; both imports sit behind the
// dev flag, so the production build drops them entirely.
import { Suspense, lazy } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";

const TweakPanel = import.meta.env.DEV
    ? lazy(() => import("@/components/dev/tweak-panel").then((module) => ({ default: module.TweakPanel })))
    : null;
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
            {TweakPanel && BreakpointIndicator ? (
                <Suspense fallback={null}>
                    <TweakPanel />
                    <BreakpointIndicator />
                </Suspense>
            ) : null}
        </>
    );
}
