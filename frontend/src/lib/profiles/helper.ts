// The owner's public link as display text. It is built from the username only after the
// username passes the profile rule, so a bad value never reaches the page. The result is text
// for the screen and for copying; it is never put into an href.
import { checkUsername } from "@/lib/profiles/model";

// "drop.link/<name>", or "" when the name fails the rule
export function linkText(username: string) {
    const check = checkUsername(username);

    return check.ok ? `drop.link/${check.value}` : "";
}
