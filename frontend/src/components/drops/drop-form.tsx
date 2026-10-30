// The send form on a public link. The sender writes up to 280 characters, counted the way the
// shared rules count them, and turns on their GPS location, asked for only on a tap. Every drop
// carries that place, rounded to about 150 m, so Send stays off until there is a fix and says
// why next to it. A blocked or failed lookup shows plain help and a way to try again. The place
// stays in memory only. The page owns the send; this form hands it the draft and shows its
// error as text in a live region. The server checks every rule again.
import { ArrowClockwise, Crosshair, PaperPlaneTilt } from "@phosphor-icons/react";
import { useState, type FormEvent } from "react";
import { useGeolocation, type GeolocationStatus } from "@/hooks/drops/use-geolocation";
import type { ApiError } from "@/lib/api";
import { MESSAGE_MAX, type DropDraft, type DropLocation } from "@/lib/drops/model";

type DropFormProps = {
    displayName: string;
    sending: boolean;
    error: ApiError | null;
    onSend: (draft: DropDraft) => void;
};

const GPS_MESSAGES: Partial<Record<GeolocationStatus, string>> = {
    denied: "Location is blocked for this page. Allow location for this site in your browser or phone settings, then try again. In Instagram, TikTok or Messenger, tap Open in browser first.",
    timeout: "Finding your location took too long. Try again.",
    unavailable: "Your location is not available here. Try again.",
};

const SEND_REASON = "Turn on your location to send.";
const SHOWN_DECIMALS = 3;

export function DropForm({ displayName, sending, error, onSend }: DropFormProps) {
    const geo = useGeolocation();
    const [message, setMessage] = useState("");
    const count = Array.from(message.trim()).length;
    const over = count > MESSAGE_MAX;
    const locating = geo.status === "locating";
    const failed = geo.status === "denied" || geo.status === "timeout" || geo.status === "unavailable";
    const gpsMessage = GPS_MESSAGES[geo.status] ?? "";
    const location: DropLocation | null =
        geo.status === "ready" && geo.position
            ? { latitude: geo.position.latitude, longitude: geo.position.longitude, source: "gps" }
            : null;
    const sendNote = error?.message ?? (location ? "" : SEND_REASON);

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (sending || !location) {
            return;
        }

        onSend({ message, location });
    }

    return (
        <form className="send-form" noValidate onSubmit={handleSubmit}>
            {/* message */}
            <div className="placement auth-stack">
                <div className="container">
                    <label className="auth-label" htmlFor="send-message">
                        Your message
                    </label>
                </div>
                <div className="container">
                    <textarea
                        id="send-message"
                        className="send-message"
                        name="message"
                        rows={4}
                        placeholder={`Say something to ${displayName}`}
                        value={message}
                        aria-invalid={over ? true : undefined}
                        aria-describedby="send-count send-error"
                        onChange={(event) => {
                            setMessage(event.target.value);
                        }}
                    />
                </div>
                <div className="container send-count-row">
                    <p id="send-count" className="send-count" data-over={over ? "true" : undefined}>
                        {count}/{MESSAGE_MAX}
                    </p>
                </div>
            </div>

            {/* place heading */}
            <div className="placement auth-stack">
                <div className="container">
                    <p className="auth-label">Your place</p>
                </div>
                <div className="container">
                    <p className="auth-note">
                        Every drop carries a place. It gives {displayName} a clue, rounded to about 150 m.
                    </p>
                </div>
            </div>

            {location ? (
                // GPS place
                <div className="placement send-place">
                    <div className="container">
                        <span className="send-place-mark" aria-hidden="true">
                            <Crosshair weight="bold" />
                        </span>
                    </div>
                    <div className="container send-grow">
                        <p className="send-place-title">From your GPS</p>
                        <p className="send-place-coords">
                            {location.latitude.toFixed(SHOWN_DECIMALS)}, {location.longitude.toFixed(SHOWN_DECIMALS)}
                        </p>
                        <p className="auth-note">Rounded to about 150 m</p>
                    </div>
                    <div className="container">
                        <button
                            className="send-icon-btn"
                            type="button"
                            aria-label="Refresh your location"
                            onClick={geo.request}
                        >
                            <ArrowClockwise weight="bold" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            ) : (
                // turn on location
                <div className="placement auth-stack">
                    <div className="container">
                        <button
                            className="auth-btn auth-btn-paper"
                            type="button"
                            disabled={locating}
                            onClick={geo.request}
                        >
                            {locating ? (
                                <span className="auth-spin" aria-hidden="true" />
                            ) : (
                                <Crosshair weight="bold" aria-hidden="true" />
                            )}
                            {locating ? "Finding you" : failed ? "Try again" : "Turn on location"}
                        </button>
                    </div>
                </div>
            )}

            {/* place status: GPS trouble */}
            <div className="placement auth-stack send-live-slot">
                <div className="container">
                    <p className="auth-status send-live" aria-live="polite">
                        {gpsMessage}
                    </p>
                </div>
            </div>

            {/* send */}
            <div className="placement auth-stack">
                <div className="container send-live-slot">
                    <p id="send-error" className="auth-error send-live" role="alert">
                        {sendNote}
                    </p>
                </div>
                <div className="container">
                    <button
                        className="auth-btn auth-btn-ink"
                        type="submit"
                        disabled={sending || !location}
                        aria-describedby="send-error"
                    >
                        {sending ? (
                            <span className="auth-spin" aria-hidden="true" />
                        ) : (
                            <PaperPlaneTilt weight="bold" aria-hidden="true" />
                        )}
                        {sending ? "Sending" : "Send drop"}
                    </button>
                </div>
                <div className="container">
                    <p className="auth-note send-center">
                        They see your words and your rounded place. Never your name.
                    </p>
                </div>
            </div>
        </form>
    );
}
