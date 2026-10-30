// Frame for the signed-in app: the inbox, a drop's page, the map, my link and settings. The
// marbled bath sits fixed behind everything (on phones it shows only behind the header and
// fades out below), a "Skip to content" link jumps past the nav, the glass nav sits at the
// bottom on phones and on the left from tablets up, and the page's own content goes in main.
import type { MouseEvent, ReactNode } from "react";
import { AppNav } from "@/components/layout/app-nav";
import { MarbleBackground } from "@/components/marble/marble-background";
import "@/styles/auth.css";
import "@/styles/app-shell.css";

// moves focus into main without changing the address
function handleSkip(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    document.getElementById("app-main")?.focus();
}

export function AppShell({ children }: { children: ReactNode }) {
    return (
        <div className="auth-page app-page">
            <div className="app-bath">
                <MarbleBackground intensity="chrome" />
            </div>

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
