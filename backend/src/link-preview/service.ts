// Link preview rendering. Fills the built index.html with title and Open Graph tags, so a
// shared link shows a title, a line of text and the Drop preview image in chat apps. A
// profile link says "Send {name} an anonymous drop"; every other page gets the site card.
// Every value that comes from a profile is escaped before it lands in the HTML.
import type { PublicProfile } from "../profiles/service.js";

const ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

export const PREVIEW_IMAGE = {
    path: "/og-image.png",
    width: 1200,
    height: 630,
    alt: "Drop: anonymous notes tied to real places",
};
export const SITE_TITLE = "Drop: anonymous notes tied to real places";
export const SITE_DESCRIPTION =
    "Post your link to your story. Friends leave you anonymous notes, with a place and a photo as clues.";

type Preview = { title: string; description: string; url: string; origin: string };

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

// the title, description and Open Graph tags for one page, all escaped
function fillPreview(template: string, preview: Preview): string {
    const title = escapeHtml(preview.title);
    const description = escapeHtml(preview.description);
    const tags = [
        `<meta name="description" content="${description}" />`,
        `<meta property="og:site_name" content="Drop" />`,
        `<meta property="og:title" content="${title}" />`,
        `<meta property="og:description" content="${description}" />`,
        `<meta property="og:url" content="${escapeHtml(preview.url)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:image" content="${escapeHtml(preview.origin + PREVIEW_IMAGE.path)}" />`,
        `<meta property="og:image:width" content="${PREVIEW_IMAGE.width}" />`,
        `<meta property="og:image:height" content="${PREVIEW_IMAGE.height}" />`,
        `<meta property="og:image:alt" content="${escapeHtml(PREVIEW_IMAGE.alt)}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
    ].join("\n        ");

    // replacer functions keep "$" in a name from being read as a replacement pattern
    return template
        .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${title}</title>`)
        .replace("</head>", () => `        ${tags}\n    </head>`);
}

export function renderProfilePage(
    template: string,
    profile: Pick<PublicProfile, "username" | "displayName">,
    origin: string,
): string {
    return fillPreview(template, {
        title: `Send ${profile.displayName} an anonymous drop`,
        description: `Leave ${profile.displayName} an anonymous message, and a place if you like.`,
        url: `${origin}/${profile.username}`,
        origin,
    });
}

export function renderSitePage(template: string, origin: string): string {
    return fillPreview(template, { title: SITE_TITLE, description: SITE_DESCRIPTION, url: `${origin}/`, origin });
}
