// The send form on a public link. The sender writes up to 280 characters, counted the way the
// shared rules count them, and may add a place: their GPS position, asked for only on a tap,
// or a pin placed on a map in a sheet that loads the map library only when it opens. The
// chosen place shows where it came from and stays in memory only. The page owns the send;
// this form hands it the draft and shows its error as text in a live region.
import { Crosshair, MapPin, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { Suspense, lazy, useRef, useState, type FormEvent } from "react";
import { useGeolocation, type GeolocationStatus } from "@/hooks/drops/use-geolocation";
import type { ApiError } from "@/lib/api";
import { MESSAGE_MAX, type DropDraft, type DropLocation } from "@/lib/drops/model";
import type { MapCenter } from "./location-map";

type DropFormProps = {
    displayName: string;
    sending: boolean;
    error: ApiError | null;
    onSend: (draft: DropDraft) => void;
};

type PlaceChoice = "none" | "gps" | "pin";

const LocationSheet = lazy(() => import("./location-sheet").then((module) => ({ default: module.LocationSheet })));

const GPS_MESSAGES: Partial<Record<GeolocationStatus, string>> = {
    denied: "Location is blocked for this page. You can place a pin instead.",
    timeout: "Finding your location took too long. You can place a pin instead.",
    unavailable: "Your location is not available here. You can place a pin instead.",
};

const SHOWN_DECIMALS = 3;

export function DropForm({ displayName, sending, error, onSend }: DropFormProps) {
    const geo = useGeolocation();
    const gpsButtonRef = useRef<HTMLButtonElement>(null);
    const [message, setMessage] = useState("");
    const [choice, setChoice] = useState<PlaceChoice>("none");
    const [pin, setPin] = useState<DropLocation | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const count = Array.from(message.trim()).length;
    const over = count > MESSAGE_MAX;
    const locating = choice === "gps" && geo.status === "locating";
    const gpsMessage = choice === "gps" ? (GPS_MESSAGES[geo.status] ?? "") : "";
    const gpsPlace: DropLocation | null =
        geo.status === "ready" && geo.position
            ? { latitude: geo.position.latitude, longitude: geo.position.longitude, source: "gps" }
            : null;
    const location = choice === "gps" ? gpsPlace : choice === "pin" ? pin : null;
    const sheetStart: MapCenter | null = pin ?? gpsPlace;

    function handleUseGps() {
        setChoice("gps");
        geo.request();
    }

    function handleConfirmPin(center: MapCenter) {
        setPin({ latitude: center.latitude, longitude: center.longitude, source: "manual" });
        setChoice("pin");
        setSheetOpen(false);
    }

    // drop the place; focus moves to the first place button
    function handleRemovePlace() {
        setChoice("none");
        setPin(null);
        geo.reset();
        gpsButtonRef.current?.focus();
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (sending) {
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
                    <p className="auth-label">Add a place</p>
                </div>
                <div className="container">
                    <p className="auth-note">Optional. It gives {displayName} a clue, rounded to about 150 m.</p>
                </div>
            </div>

            {/* place options */}
            <div className="placement send-split">
                <div className="container">
                    <button
                        className="auth-btn auth-btn-paper"
                        type="button"
                        ref={gpsButtonRef}
                        disabled={locating}
                        onClick={handleUseGps}
                    >
                        {locating ? (
                            <span className="auth-spin" aria-hidden="true" />
                        ) : (
                            <Crosshair weight="bold" aria-hidden="true" />
                        )}
                        {locating ? "Finding you" : "Use my location"}
                    </button>
                </div>
                <div className="container">
                    <button
                        className="auth-btn auth-btn-paper"
                        type="button"
                        onClick={() => {
                            setSheetOpen(true);
                        }}
                    >
                        <MapPin weight="bold" aria-hidden="true" />
                        Place a pin
                    </button>
                </div>
            </div>

            {/* place status: GPS trouble */}
            <div className="placement auth-stack send-live-slot">
                <div className="container">
                    <p className="auth-status send-live" aria-live="polite">
                        {gpsMessage}
                    </p>
                </div>
            </div>

            {location ? (
                // chosen place
                <div className="placement send-place">
                    <div className="container">
                        <span className="send-place-mark" aria-hidden="true">
                            {location.source === "gps" ? <Crosshair weight="bold" /> : <MapPin weight="fill" />}
                        </span>
                    </div>
                    <div className="container send-grow">
                        <p className="send-place-title">
                            {location.source === "gps" ? "From your GPS" : "Pin placed by hand"}
                        </p>
                        <p className="send-place-coords">
                            {location.latitude.toFixed(SHOWN_DECIMALS)}, {location.longitude.toFixed(SHOWN_DECIMALS)}
                        </p>
                        <p className="auth-note">Rounded to about 150 m</p>
                    </div>
                    <div className="container">
                        <button
                            className="send-icon-btn"
                            type="button"
                            aria-label="Remove the place"
                            onClick={handleRemovePlace}
                        >
                            <X weight="bold" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            ) : null}

            {/* send */}
            <div className="placement auth-stack">
                <div className="container send-live-slot">
                    <p id="send-error" className="auth-error send-live" role="alert">
                        {error?.message ?? ""}
                    </p>
                </div>
                <div className="container">
                    <button className="auth-btn auth-btn-ink" type="submit" disabled={sending}>
                        {sending ? (
                            <span className="auth-spin" aria-hidden="true" />
                        ) : (
                            <PaperPlaneTilt weight="bold" aria-hidden="true" />
                        )}
                        {sending ? "Sending" : "Send drop"}
                    </button>
                </div>
                <div className="container">
                    <p className="auth-note send-center">They see your words and any place you add. Never your name.</p>
                </div>
            </div>

            {sheetOpen ? (
                <Suspense
                    fallback={
                        <div className="placement auth-stack">
                            <div className="container">
                                <p className="auth-status" role="status">
                                    Opening the map
                                </p>
                            </div>
                        </div>
                    }
                >
                    <LocationSheet
                        start={sheetStart}
                        onConfirm={handleConfirmPin}
                        onClose={() => {
                            setSheetOpen(false);
                        }}
                    />
                </Suspense>
            ) : null}
        </form>
    );
}
