// Tests for the sign-in email: the code and expiry appear in both parts, the logo and links
// point at the site's own origin, and anything odd in a value is escaped in the HTML.
import { describe, expect, it } from "vitest";
import { CODE_TTL_MINUTES, LOGO_CONTENT_ID, buildSignInEmail } from "./sign-in-email.js";

const SITE = "https://drop.fundrstudio.com/";

describe("buildSignInEmail", () => {
    it("puts the code and the expiry in the text and the HTML", () => {
        const email = buildSignInEmail("226809", SITE);

        expect(email.subject).toBe("Your Drop sign-in code");
        expect(email.text).toContain("Your Drop code is 226809.");
        expect(email.text).toContain(`It expires in ${CODE_TTL_MINUTES} minutes.`);
        expect(email.html).toContain(">226809</div>");
        expect(email.html).toContain(`It expires in ${CODE_TTL_MINUTES} minutes.`);
    });

    it("has the inline header logo and the footer from the site's origin", () => {
        const { html, text } = buildSignInEmail("226809", SITE);

        expect(html).toContain(`src="cid:${LOGO_CONTENT_ID}"`);
        expect(html).toContain('alt="Drop"');
        expect(html).toContain("Fundr. Studios © 2026");
        expect(html).toContain(">drop.fundrstudio.com</a>");
        expect(text).toContain("https://drop.fundrstudio.com");
        expect(html).not.toContain("fundrstudio.com//");
    });

    it("escapes HTML in the code", () => {
        const { html } = buildSignInEmail('<b>"1"</b>', SITE);

        expect(html).not.toContain("<b>");
        expect(html).toContain("&lt;b&gt;&quot;1&quot;&lt;/b&gt;");
    });
});
