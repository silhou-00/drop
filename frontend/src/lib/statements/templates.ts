// The ready-made statement cards the owner swipes through on My link. Each fixed card is one
// constant line that already passes the statement rule; the first card, "Write your own", has no
// fixed text and shows the free-text field instead. The page opens on the first fixed card. Accents come from the Drop palette in
// tokens.css, one per card, so the cards read as marble slabs rather than gradients.

export type StatementTemplate = { id: string; text: string; accent: string };

export const CUSTOM_TEMPLATE_ID = "custom";

export const STATEMENT_TEMPLATES: StatementTemplate[] = [
    { id: CUSTOM_TEMPLATE_ID, text: "Write your own", accent: "var(--ice)" },
    { id: "drops", text: "Send me drops", accent: "var(--accent-fill)" },
    { id: "spotted", text: "Spotted me where?", accent: "var(--ink)" },
    { id: "spot", text: "Where's our spot?", accent: "var(--accent-soft)" },
    { id: "confess", text: "Confess anything", accent: "var(--accent-ink)" },
    { id: "next", text: "Where next?", accent: "var(--ink-2)" },
];

export const DEFAULT_TEMPLATE_ID = "drops";

// the fixed card whose text is this statement, if there is one
export function templateFor(text: string) {
    return STATEMENT_TEMPLATES.find((template) => template.id !== CUSTOM_TEMPLATE_ID && template.text === text);
}
