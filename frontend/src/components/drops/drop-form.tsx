// The send form on a public link. The sender writes up to 280 characters, counted the way the
// shared rules count them, and turns on their GPS location, asked for only on a tap. Every drop
// carries that place, rounded to about 150 m, so Send stays off until there is a fix and says
// why next to it. A blocked or failed lookup shows plain help and a way to try again. The sender
// may add one photo from the camera or the gallery; it is checked by type and size on choose, a
// wrong one is not kept, and a kept one shows a local preview. The place and the photo stay in
// memory only. The page owns the send; this form hands it the draft and shows its
// error as text in a live region. The server checks every rule again.
import { ArrowClockwise, Crosshair, Image, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useGeolocation, type GeolocationStatus } from "@/hooks/drops/use-geolocation";
import type { ApiError } from "@/lib/api";
import {
    MESSAGE_MAX,
    PHOTO_MESSAGE,
    PHOTO_TYPES,
    validPhoto,
    type DropDraft,
    type DropLocation,
} from "@/lib/drops/model";

type ChosenPhoto = { file: File; url: string };

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
const KB = 1024;
const MB = 1024 * 1024;

// file size as KB below a megabyte, MB above
function formatSize(bytes: number) {
    if (bytes < MB) {
        return `${Math.max(1, Math.round(bytes / KB))} KB`;
    }

    return `${(bytes / MB).toFixed(1)} MB`;
}

export function DropForm({ displayName, sending, error, onSend }: DropFormProps) {
    const geo = useGeolocation();
    const fileRef = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState("");
    const photoUrlRef = useRef<string | null>(null);
    const [photo, setPhoto] = useState<ChosenPhoto | null>(null);
    const [photoError, setPhotoError] = useState("");
    const count = Array.from(message.trim()).length;
    const over = count > MESSAGE_MAX;
    const locating = geo.status === "locating";
    const failed = geo.status === "denied" || geo.status === "timeout" || geo.status === "unavailable";
    const gpsMessage = GPS_MESSAGES[geo.status] ?? "";
    const location: DropLocation | null =
        geo.status === "ready" && geo.position
            ? { latitude: geo.position.latitude, longitude: geo.position.longitude, source: "gps" }
            : null;
    const sendNote = photoError || (error?.message ?? (location ? "" : SEND_REASON));

    // the last preview address is revoked when the form goes away
    useEffect(() => {
        return () => {
            if (photoUrlRef.current) {
                URL.revokeObjectURL(photoUrlRef.current);
            }
        };
    }, []);

    // swaps the kept photo, revoking the old preview address
    function keepPhoto(file: File | null) {
        if (photoUrlRef.current) {
            URL.revokeObjectURL(photoUrlRef.current);
        }

        const url = file ? URL.createObjectURL(file) : null;

        photoUrlRef.current = url;
        setPhoto(file && url ? { file, url } : null);
    }

    // photo choosing: a wrong type or size is not kept
    function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;

        event.target.value = "";

        if (!file) {
            return;
        }

        if (!validPhoto(file)) {
            keepPhoto(null);
            setPhotoError(PHOTO_MESSAGE);

            return;
        }

        setPhotoError("");
        keepPhoto(file);
    }

    function handlePhotoRemove() {
        keepPhoto(null);
        setPhotoError("");
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (sending || !location) {
            return;
        }

        setPhotoError("");
        onSend({ message, location, photo: photo?.file ?? null });
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

            {/* photo heading */}
            <div className="placement auth-stack">
                <div className="container">
                    <p className="auth-label">Add a photo (optional)</p>
                </div>
                <div className="container send-file-slot">
                    <input
                        ref={fileRef}
                        id="send-photo"
                        className="send-file-input"
                        type="file"
                        name="photo"
                        accept={PHOTO_TYPES.join(",")}
                        tabIndex={-1}
                        aria-hidden="true"
                        onChange={handlePhotoChange}
                    />
                </div>
            </div>

            {photo ? (
                // chosen photo
                <div className="placement send-photo">
                    <div className="container">
                        <img className="send-photo-thumb" src={photo.url} alt="Your chosen photo" />
                    </div>
                    <div className="container send-grow">
                        <p className="send-place-title">Photo added</p>
                        <p className="send-place-coords">{formatSize(photo.file.size)}</p>
                    </div>
                    <div className="container">
                        <button
                            className="send-icon-btn"
                            type="button"
                            aria-label="Remove the photo"
                            disabled={sending}
                            onClick={handlePhotoRemove}
                        >
                            <X weight="bold" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            ) : (
                // choose a photo
                <div className="placement auth-stack">
                    <div className="container">
                        <button
                            className="auth-btn auth-btn-paper"
                            type="button"
                            disabled={sending}
                            onClick={() => {
                                fileRef.current?.click();
                            }}
                        >
                            <Image weight="bold" aria-hidden="true" />
                            Add a photo
                        </button>
                    </div>
                </div>
            )}

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
                        {sending ? (photo ? "Sending…" : "Sending") : "Send drop"}
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
