// The Privacy page, public at /privacy. Says in plain words what Drop keeps, for how long, who
// helps run it, and how to delete it all. It matches what the code does today: senders are
// counted only through scrambled codes, sign-ins keep the network address and browser for 7
// days, and drops sent by a deleted account stay with the people who got them. The text is
// static; the contact link is built from the checked config value.
import { createFileRoute } from "@tanstack/react-router";
import { LegalSection } from "@/components/legal/legal-section";
import { LegalShell } from "@/components/legal/legal-shell";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/config";

export const Route = createFileRoute("/privacy")({
    component: PrivacyPage,
});

const LAST_UPDATED = "November 1, 2026";
const NPC_URL = "https://privacy.gov.ph";

function PrivacyPage() {
    return (
        <LegalShell title="Privacy">
            {/* title section */}
            <section className="section" aria-labelledby="privacy-title">
                {/* heading */}
                <div className="sub-section">
                    <div className="placement legal-text">
                        <div className="container">
                            <h1 id="privacy-title" className="legal-h1">
                                Privacy Policy
                            </h1>
                        </div>
                        <div className="container">
                            <p className="legal-updated">Last updated {LAST_UPDATED}</p>
                        </div>
                    </div>
                </div>
            </section>

            <LegalSection id="who-we-are" title="Who we are">
                <div className="container">
                    <p>
                        Drop is run from the Philippines and follows the Data Privacy Act of 2012. You can reach us at{" "}
                        <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="account-data" title="What we keep when you have an account">
                <div className="container">
                    <ul className="legal-list">
                        <li>Your email address, to send sign-in codes. Each code expires after 5 minutes.</li>
                        <li>Your link name, display name and settings.</li>
                        <li>Your statements: what each one says, and when it started and ended.</li>
                        <li>
                            For each sign-in, your device&apos;s network address and browser name, kept until you sign
                            out or 7 days pass.
                        </li>
                    </ul>
                </div>
            </LegalSection>

            <LegalSection id="drop-data" title="What we keep about drops sent to you">
                <div className="container">
                    <ul className="legal-list">
                        <li>The message, the time, and whether you read it.</li>
                        <li>The place, rounded to about 150 m, with a neighbourhood name.</li>
                        <li>The photo, with hidden data such as GPS removed.</li>
                        <li>
                            Two scrambled codes made from the sender&apos;s network address and device. They cannot be
                            turned back into an address, and we use them only to limit how many drops one person can
                            send. We clear them after 90 days.
                        </li>
                    </ul>
                </div>
            </LegalSection>

            <LegalSection id="senders" title="Senders">
                <div className="container">
                    <p>
                        Senders do not need an account. We never store a sender&apos;s network address as it is. Their
                        browser keeps a random code in a cookie for a year so limits can count devices.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="cookies" title="Cookies and browser storage">
                <div className="container">
                    <ul className="legal-list">
                        <li>A sign-in cookie that keeps you signed in, for up to 7 days.</li>
                        <li>A device cookie with a random code, for a year, used only for sending limits.</li>
                        <li>Your light or dark choice, saved on your device.</li>
                    </ul>
                </div>
                <div className="container">
                    <p>No ads, no tracking, no analytics.</p>
                </div>
            </LegalSection>

            <LegalSection id="helpers" title="Who helps us run Drop">
                <div className="container">
                    <ul className="legal-list">
                        <li>Supabase, which holds the database and photos in Singapore.</li>
                        <li>A hosting and network provider.</li>
                        <li>Resend, which delivers the sign-in emails.</li>
                        <li>LocationIQ, which names places. It receives only the rounded point.</li>
                    </ul>
                </div>
                <div className="container">
                    <p>Some of them keep data outside the Philippines.</p>
                </div>
            </LegalSection>

            <LegalSection id="how-long" title="How long we keep it">
                <div className="container">
                    <ul className="legal-list">
                        <li>Your account, statements and drops: until you delete them or your account.</li>
                        <li>Sign-in records: 7 days.</li>
                        <li>Place names: 48 hours.</li>
                        <li>A deleted link name: locked for 30 days, so nobody else can take it right away.</li>
                        <li>Scrambled sender codes on drops: 90 days.</li>
                        <li>We keep no backup copies, so anything deleted is gone for good.</li>
                    </ul>
                </div>
            </LegalSection>

            <LegalSection id="deleting" title="Deleting your account">
                <div className="container">
                    <p>
                        Go to Settings, then Delete account. It removes your account, your profile, your statements,
                        every drop sent to you and their photos, and signs you out everywhere.
                    </p>
                </div>
                <div className="container">
                    <p>
                        Drops you sent to other people stay in their inbox, because Drop cannot tell they came from you.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="rights" title="Your rights">
                <div className="container">
                    <p>
                        You can ask to see, correct or delete your data, object to how we use it, or get a copy of it.
                        Write to <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>.
                    </p>
                </div>
                <div className="container">
                    <p>
                        You can complain to the{" "}
                        <a href={NPC_URL} target="_blank" rel="noopener noreferrer">
                            National Privacy Commission
                        </a>
                        .
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="young-people" title="Children and teens">
                <div className="container">
                    <p>
                        Drop is open to all ages. If you are under 18, talk to a parent or guardian before you share
                        your link. Do not share your school, address or face. A parent or guardian can write to us to
                        delete a child&apos;s account.
                    </p>
                </div>
            </LegalSection>

            <LegalSection id="changes" title="Changes">
                <div className="container">
                    <p>We will update the date at the top when this policy changes.</p>
                </div>
            </LegalSection>
        </LegalShell>
    );
}
