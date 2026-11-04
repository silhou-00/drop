// Tests for link preview rendering: the tags that are added, the preview image, the site
// card for other pages, and that a display name with markup or quotes cannot break out.
import { describe, expect, it } from "vitest";
import { escapeHtml, renderProfilePage, renderSitePage, SITE_TITLE } from "./service.js";

const template = `<!doctype html>
<html>
    <head>
        <title>Drop</title>
    </head>
    <body></body>
</html>`;

describe("escapeHtml", () => {
    it("escapes the five special characters", () => {
        expect(escapeHtml(`<a href="x">&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
    });
});

describe("renderProfilePage", () => {
    it("never carries the statement text", () => {
        const profile = {
            username: "maya",
            displayName: "Maya",
            statement: { text: "Out tonight at the pier", ends_at: "2026-10-31T12:00:00.000Z", seconds_left: 600 },
        };
        const html = renderProfilePage(template, profile, "https://drop.example");

        expect(html).not.toContain("Out tonight");
        expect(html).not.toContain("pier");
    });

    it("sets the title and adds the Open Graph and Twitter tags", () => {
        const html = renderProfilePage(template, { username: "maya", displayName: "Maya" }, "https://drop.example");

        expect(html).toContain("<title>Send Maya an anonymous drop</title>");
        expect(html).toContain('<meta property="og:title" content="Send Maya an anonymous drop" />');
        expect(html).toContain('<meta property="og:url" content="https://drop.example/maya" />');
        expect(html).toContain('<meta property="og:type" content="website" />');
        expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
        expect(html).toContain('property="og:description"');
    });

    it("adds the preview image as a full address with its size", () => {
        const html = renderProfilePage(template, { username: "maya", displayName: "Maya" }, "https://drop.example");

        expect(html).toContain('<meta property="og:image" content="https://drop.example/og-image.png" />');
        expect(html).toContain('<meta property="og:image:width" content="1200" />');
        expect(html).toContain('<meta property="og:image:height" content="630" />');
    });

    it("escapes a display name with a script tag and quotes", () => {
        const name = `<script>alert(1)</script>" onload="x`;
        const html = renderProfilePage(template, { username: "maya", displayName: name }, "https://drop.example");

        expect(html).not.toContain("<script>");
        expect(html).not.toContain(`" onload="x`);
        expect(html).toContain("&lt;script&gt;");
    });

    it("keeps dollar signs in a name as they are", () => {
        const html = renderProfilePage(template, { username: "maya", displayName: "$& $1" }, "https://drop.example");

        expect(html).toContain("Send $&amp; $1 an anonymous drop");
    });
});

describe("renderSitePage", () => {
    it("gives every other page the site card and image", () => {
        const html = renderSitePage(template, "https://drop.example");

        expect(html).toContain(`<title>${SITE_TITLE}</title>`);
        expect(html).toContain('<meta property="og:url" content="https://drop.example/" />');
        expect(html).toContain('<meta property="og:image" content="https://drop.example/og-image.png" />');
        expect(html).toContain('<meta name="description"');
    });
});
