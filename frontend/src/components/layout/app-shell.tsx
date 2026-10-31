// Frame for the signed-in app: the inbox, a drop's page, the map, my link and settings. The
// marbled bath sits fixed behind everything (on phones it shows only behind the header and
// fades out below), a "Skip to content" link jumps past the nav, the glass nav sits at the
// bottom on phones and on the left from tablets up, and the page's own content goes in main.
// The map fills the screen itself, so the bath is left out there. The bath's code loads after
// the page: plain ground shows first, then the marble fades in once it has arrived. While the
// shell is open, a theme choice made in another tab is shown here too.
import { useLocation } from "@tanstack/react-router";
import { Suspense, lazy, useEffect, type MouseEvent, type ReactNode } from "react";
import { AppNav } from "@/components/layout/app-nav";
import { followOtherTabs } from "@/lib/theme/preference";
import "@/styles/auth.css";
import "@/styles/app-shell.css";

const MarbleBackground = lazy(() =>
    import("@/components/marble/marble-background").then((module) => ({ default: module.MarbleBackground })),
);

// moves focus into main without changing the address
function handleSkip(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    document.getElementById("app-main")?.focus();
}

export function AppShell({ children }: { children: ReactNode }) {
    const bare = useLocation({ select: (location) => location.pathname === "/map" });

    // follow a theme change made in another tab
    useEffect(() => followOtherTabs(), []);

    return (
        <div className="auth-page app-page">
            {bare ? null : (
                <div className="app-bath">
                    <Suspense fallback={null}>
                        <MarbleBackground intensity="chrome" className="app-bath-marble" />
                    </Suspense>
                </div>
            )}

            <a className="app-skip" href="#app-main" onClick={handleSkip}>
                Skip to content
            </a>

            <AppNav />

            <main id="app-main" className="app-main" tabIndex={-1}>
                {children}
            </main>
        </div>
    );
}
