// Link preview rendering. Fills the built index.html with title and Open Graph tags for
// one profile, so a shared link shows "Send {name} an anonymous drop" in chat apps. Every
// value that comes from a profile is escaped before it lands in the HTML.
import type { PublicProfile } from "../profiles/service.js";

const ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export function renderProfilePage(
    template: string,
    profile: Pick<PublicProfile, "username" | "displayName">,
    origin: string,
): string {
    const title = escapeHtml(`Send ${profile.displayName} an anonymous drop`);
    const description = escapeHtml(`Leave ${profile.displayName} an anonymous message, and a place if you like.`);
    const url = escapeHtml(`${origin}/${profile.username}`);
    const tags = [
        `<meta property="og:title" content="${title}" />`,
        `<meta property="og:description" content="${description}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta name="twitter:card" content="summary" />`,
    ].join("\n        ");

    // replacer functions keep "$" in a name from being read as a replacement pattern
    return template
        .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${title}</title>`)
        .replace("</head>", () => `        ${tags}\n    </head>`);
}
