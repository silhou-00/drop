// The frontend's one place for config. The contact address is checked against an email
// pattern when the app is built (see vite.config.ts), so the mailto link built from it is
// safe to use as an href. It is a public role address, never a personal one.

export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL;
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}`;
