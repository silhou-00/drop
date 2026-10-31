// The Safety page, public at /safety. Drop has no report or block button and nobody reads
// drops, so this page says plainly what a person can do: delete, end a statement, talk to
// someone, and call for help. Only the two checked phone numbers (911 and 1553) are listed.
// Phone and mail links are built from constants and the checked config value only.
import { createFileRoute } from "@tanstack/react-router";
import { LegalSection } from "@/components/legal/legal-section";
import { LegalShell } from "@/components/legal/legal-shell";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/config";

export const Route = createFileRoute("/safety")({
    component: SafetyPage,
});

const LAST_UPDATED = "October 31, 2026";

function SafetyPage() {
    return (
        <LegalShell title="Safety">
            {/* title section */}
            <section className="section" aria-labelledby="safety-title">
                {/* heading */}
                <div className="sub-section">
                    <div className="placement legal-text">
                        <div className="container">
                            <h1 id="safety-title" className="legal-h1">
                                Safety
                            </h1>
                        </div>
                        <div className="container">
                            <p className="legal-updated">Last updated {LAST_UPDATED}</p>
                        </div>
                    </div>
                </div>
            </section>

            <LegalSection id="plainly" title="Plainly">
                <div className="container">
                    <p>Drop has no report or block button. Nobody at Drop reads drops.</p>
                </div>
            </LegalSection>

            <LegalSection id="upset" title="If a drop upsets you">
                <div className="container">
                    <ul className="legal-list">
                        <li>You do not have to answer it. Delete it from your inbox.</li>
                        <li>End your statement early, or let it run out.</li>
                        <li>Show it to someone you trust.</li>
                    </ul>
                </div>
            </LegalSection>

            <LegalSection id="before-sending" title="Before you send or share">
                <div className="container">
                    <ul className="legal-list">
                        <li>Do not send photos that show faces, uniforms, house numbers or plates.</li>
                        <li>Your place is rounded to about 150 m, but it still shows your area.</li>
                        <li>The person you send to can share your note.</li>
                    </ul>
                </div>
            </LegalSection>

            <LegalSection id="danger" title="If you are in danger">
                <div className="container">
                    <p>
                        Call <a href="tel:911">911</a> for police, fire or ambulance anywhere in the Philippines, or go
                        to the nearest police station.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="talk" title="If you need to talk">
                <div className="container">
                    <p>
                        NCMH Crisis Hotline: <a href="tel:1553">1553</a>, free, any time.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="child-images" title="If you receive sexual images of a child">
                <div className="container">
                    <p>
                        Do not save or forward them. Report them to the police, then delete them, and tell us at{" "}
                        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="contact" title="Contact Drop">
                <div className="container">
                    <p>
                        We cannot see who sent a drop, but we can act on accounts that break the Terms. Write to{" "}
                        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
                    </p>
                </div>
            </LegalSection>
        </LegalShell>
    );
}
