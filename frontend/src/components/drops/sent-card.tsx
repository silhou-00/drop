// Confirmation after a drop is sent. Says the drop went and that the sender stays unknown,
// offers to send another (which clears the send state and brings the empty form back), and
// links on to claiming a drop.link of their own. Focus moves to the heading when it appears,
// so screen readers announce the result.
import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

type SentCardProps = { displayName: string; onSendAnother: () => void };

export function SentCard({ displayName, onSendAnother }: SentCardProps) {
    const titleRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    return (
        // sent section
        <section className="section" aria-labelledby="sent-title">
            {/* card */}
            <div className="sub-section auth-card send-card">
                {/* result */}
                <div className="placement auth-stack">
                    <div className="container">
                        <span className="send-sent-mark" aria-hidden="true">
                            <CheckCircle weight="fill" />
                        </span>
                    </div>
                    <div className="container">
                        <h1 id="sent-title" className="auth-title" ref={titleRef} tabIndex={-1}>
                            Sent.
                        </h1>
                    </div>
                    <div className="container">
                        <p className="auth-lede">{displayName} will never know it was you.</p>
                    </div>
                </div>

                {/* next steps */}
                <div className="placement auth-stack">
                    <div className="container">
                        <Link className="auth-btn auth-btn-ink" to="/claim">
                            Get your own drop.link
                            <ArrowRight weight="bold" aria-hidden="true" />
                        </Link>
                    </div>
                    <div className="container">
                        <button className="auth-btn auth-btn-paper" type="button" onClick={onSendAnother}>
                            Send another
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}
