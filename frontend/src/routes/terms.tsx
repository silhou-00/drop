// The Terms page, public at /terms. Short, plain rules for using Drop: it is open to everyone
// and people can say what they like, as long as they respect other people's privacy and break
// no law. The text is static; the contact link is built from the checked config value.
import { createFileRoute } from "@tanstack/react-router";
import { LegalSection } from "@/components/legal/legal-section";
import { LegalShell } from "@/components/legal/legal-shell";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/config";

export const Route = createFileRoute("/terms")({
    component: TermsPage,
});

const LAST_UPDATED = "October 31, 2026";

function TermsPage() {
    return (
        <LegalShell title="Terms">
            {/* title section */}
            <section className="section" aria-labelledby="terms-title">
                {/* heading */}
                <div className="sub-section">
                    <div className="placement legal-text">
                        <div className="container">
                            <h1 id="terms-title" className="legal-h1">
                                Terms of Service
                            </h1>
                        </div>
                        <div className="container">
                            <p className="legal-updated">Last updated {LAST_UPDATED}</p>
                        </div>
                    </div>
                </div>
            </section>

            <LegalSection id="what-drop-is" title="What Drop is">
                <div className="container">
                    <p>
                        Drop lets anyone send you an anonymous note from where they are. Each note carries a rough
                        place, rounded to about 150 m.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="who-can-use" title="Who can use it">
                <div className="container">
                    <p>
                        Drop is open to everyone. If you are under 18, use Drop with a parent or guardian who knows you
                        are on it.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="your-account" title="Your account">
                <div className="container">
                    <p>One account, one link. Keep your email safe: anyone who can read it can sign in as you.</p>
                </div>
            </LegalSection>

            <LegalSection id="statements" title="Statements">
                <div className="container">
                    <p>
                        Your link takes drops only while a statement is open. A statement lasts 2 hours, or until you
                        end it.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="what-you-send" title="What you send">
                <div className="container">
                    <p>
                        Say what you like. Drop does not read or check drops before they arrive, so you are responsible
                        for what you send. The person you send to can save your note and share it as an image.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="not-allowed" title="Not allowed">
                <div className="container">
                    <p>Anything goes, except:</p>
                </div>
                <div className="container">
                    <ul className="legal-list">
                        <li>Anything illegal.</li>
                        <li>Sexual images or messages involving anyone under 18. We report this to the authorities.</li>
                        <li>Threats of violence against anyone.</li>
                        <li>
                            Breaking someone&apos;s privacy: posting their home address, phone number or other private
                            details, or sharing a photo of someone without their consent.
                        </li>
                    </ul>
                </div>
            </LegalSection>

            <LegalSection id="what-we-can-do" title="What we can do">
                <div className="container">
                    <p>
                        We can remove drops and close accounts that break these rules, without warning. If the law
                        requires it, we may share the little we hold.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="no-guarantees" title="No guarantees">
                <div className="container">
                    <p>Drop is offered as it is. It can change or stop.</p>
                </div>
            </LegalSection>

            <LegalSection id="changes" title="Changes and law">
                <div className="container">
                    <p>We will update the date at the top when these terms change. Philippine law applies.</p>
                </div>
            </LegalSection>

            <LegalSection id="contact" title="Contact">
                <div className="container">
                    <p>
                        Write to us at <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
                    </p>
                </div>
            </LegalSection>
        </LegalShell>
    );
}
