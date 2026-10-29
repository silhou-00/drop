// Tests for link preview rendering: the tags that are added, and that a display name
// with markup or quotes cannot break out of the HTML.
import { describe, expect, it } from "vitest";
import { escapeHtml, renderProfilePage } from "./service.js";

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
    it("sets the title and adds the Open Graph and Twitter tags", () => {
        const html = renderProfilePage(template, { username: "maya", displayName: "Maya" }, "https://drop.example");

        expect(html).toContain("<title>Send Maya an anonymous drop</title>");
        expect(html).toContain('<meta property="og:title" content="Send Maya an anonymous drop" />');
        expect(html).toContain('<meta property="og:url" content="https://drop.example/maya" />');
        expect(html).toContain('<meta property="og:type" content="website" />');
        expect(html).toContain('<meta name="twitter:card" content="summary" />');
        expect(html).toContain('property="og:description"');
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
