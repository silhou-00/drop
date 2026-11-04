// The sign-in code email: subject, plain text and HTML. The HTML is one centred card in tables
// with inline styles, because mail apps ignore style sheets: the logo on a pale header, the code
// in large spaced type, how long it lasts, and a footer with the studio line and the site
// address. The logo is a PNG on the site itself, since mail apps do not show SVG; with images
// off, its alt text still reads "Drop". Every value put into the HTML is escaped first.

export const CODE_TTL_MINUTES = 5;

const SUBJECT = "Your Drop sign-in code";
const COPYRIGHT = "Fundr. Studios © 2026";
const INK = "#0a0a0a";
const INK_2 = "#3c474d";
const GROUND = "#edf2f4";
const PAPER = "#ffffff";
const HAIR = "#d5dcde";
const FONT = "'Onest', 'Segoe UI', Helvetica, Arial, sans-serif";
const CODE_FONT = "'Azeret Mono', 'SFMono-Regular', Consolas, 'Courier New', monospace";

export type SignInEmail = { subject: string; text: string; html: string };

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

// the site's address without a trailing slash, and the name shown for it
function siteParts(siteUrl: string) {
    const url = new URL(siteUrl);

    return { origin: url.origin, host: url.host };
}

export function buildSignInEmail(code: string, siteUrl: string): SignInEmail {
    const { origin, host } = siteParts(siteUrl);
    const safeCode = escapeHtml(code);
    const safeOrigin = escapeHtml(origin);
    const safeHost = escapeHtml(host);
    const lasts = `It expires in ${CODE_TTL_MINUTES} minutes.`;
    const ignore = "If you did not try to sign in to Drop, you can ignore this email.";

    const text = [`Your Drop code is ${code}.`, lasts, "", ignore, "", COPYRIGHT, origin].join("\n");

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${SUBJECT}</title>
</head>
<body style="margin:0;padding:0;background:${GROUND};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your Drop code is ${safeCode}. ${lasts}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUND};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:${PAPER};border-radius:24px;overflow:hidden;">
<tr><td align="center" style="padding:32px 24px 24px;border-bottom:1px solid ${HAIR};">
<a href="${safeOrigin}" style="text-decoration:none;"><img src="${safeOrigin}/brand/logo-email.png" width="128" height="66" alt="Drop" style="display:block;border:0;width:128px;height:66px;font:700 28px ${FONT};color:${INK};"></a>
</td></tr>
<tr><td style="padding:32px 32px 8px;font:700 22px/1.3 ${FONT};color:${INK};">Your sign-in code</td></tr>
<tr><td style="padding:0 32px 24px;font:400 17px/1.5 ${FONT};color:${INK_2};">Enter this code on Drop to finish signing in.</td></tr>
<tr><td align="center" style="padding:0 32px;">
<div style="padding:20px 12px;border-radius:16px;background:${GROUND};font:700 40px/1 ${CODE_FONT};letter-spacing:10px;color:${INK};">${safeCode}</div>
</td></tr>
<tr><td style="padding:24px 32px 8px;font:400 17px/1.5 ${FONT};color:${INK_2};">${lasts}</td></tr>
<tr><td style="padding:0 32px 32px;font:400 15px/1.5 ${FONT};color:${INK_2};">${ignore}</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
<tr><td align="center" style="padding:20px 24px 0;font:400 13px/1.6 ${FONT};color:${INK_2};">${COPYRIGHT}<br><a href="${safeOrigin}" style="color:${INK_2};text-decoration:underline;">${safeHost}</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    return { subject: SUBJECT, text, html };
}
