// The owner's public link, as display text and as the full address. Both are built from the
// username only after it passes the profile rule, so a bad value never reaches the page, and
// both use the site's own address, so the link is right on any host the app runs on. The
// results are text for the screen and for copying; they are never put into an href.
import { checkUsername } from "@/lib/profiles/model";

// "<host>/<name>", or "" when the name fails the rule
export function linkText(username: string) {
    const check = checkUsername(username);

    return check.ok ? `${window.location.host}/${check.value}` : "";
}

// "<origin>/<name>" for the clipboard and the share sheet, or "" when the name fails the rule
export function linkUrl(username: string) {
    const check = checkUsername(username);

    return check.ok ? `${window.location.origin}/${check.value}` : "";
}
