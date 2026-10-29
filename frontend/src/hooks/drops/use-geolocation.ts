// The browser's location for a drop. Nothing is asked until request() is called, so the
// permission prompt follows a tap. The position lives in memory only and is never stored.
// Results that arrive after the page has left are ignored.
import { useCallback, useEffect, useRef, useState } from "react";

const TIMEOUT_MS = 10_000;
const MAX_AGE_MS = 60_000;

export type GeolocationStatus = "idle" | "locating" | "ready" | "denied" | "unavailable" | "timeout";

export type GeoPosition = { latitude: number; longitude: number; accuracy: number };

export function useGeolocation() {
    const mountedRef = useRef(true);
    const [status, setStatus] = useState<GeolocationStatus>("idle");
    const [position, setPosition] = useState<GeoPosition | null>(null);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
        };
    }, []);

    const request = useCallback(() => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
            setStatus("unavailable");

            return;
        }

        setStatus("locating");
        setPosition(null);

        navigator.geolocation.getCurrentPosition(
            (result) => {
                if (!mountedRef.current) {
                    return;
                }

                setPosition({
                    latitude: result.coords.latitude,
                    longitude: result.coords.longitude,
                    accuracy: result.coords.accuracy,
                });
                setStatus("ready");
            },
            (error) => {
                if (!mountedRef.current) {
                    return;
                }

                if (error.code === error.PERMISSION_DENIED) {
                    setStatus("denied");
                } else if (error.code === error.TIMEOUT) {
                    setStatus("timeout");
                } else {
                    setStatus("unavailable");
                }
            },
            { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: MAX_AGE_MS },
        );
    }, []);

    const reset = useCallback(() => {
        setStatus("idle");
        setPosition(null);
    }, []);

    return { status, position, request, reset };
}
