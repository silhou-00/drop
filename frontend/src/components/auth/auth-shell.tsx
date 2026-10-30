// Page frame shared by the auth pages (sign-in, claim), the inbox and the send page. The marbled bath at content
// intensity sits fixed behind everything, the logo links back to the landing, and the page's
// own sections are centred below it. The pages bring their card; this only frames it.
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MarbleBackground } from "@/components/marble/marble-background";
import "@/styles/auth.css";

const DARK_QUERY = "(prefers-color-scheme: dark)";

export function AuthShell({ children }: { children: ReactNode }) {
    return (
        <div className="auth-page">
            <div className="auth-bath">
                <MarbleBackground intensity="content" />
            </div>

            {/* top bar */}
            <header className="section auth-top">
                {/* logo row */}
                <div className="sub-section">
                    <div className="placement">
                        <div className="container">
                            <Link className="auth-home" to="/" aria-label="Drop home">
                                <picture>
                                    <source media={DARK_QUERY} srcSet="/brand/logo-dark.svg" />
                                    <img className="auth-logo" src="/brand/logo.svg" alt="" />
                                </picture>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <main className="auth-body">{children}</main>
        </div>
    );
}
