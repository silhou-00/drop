// Pin sheet for the send form. A modal dialog that rises as a bottom sheet on phones and sits
// centred on wider screens. The browser's modal dialog closes it on Escape, Tab wraps around
// inside it, a tap on the backdrop closes it too, and focus goes back to the button that
// opened it. The map starts at the sender's GPS position when there is one, otherwise over Metro
// Manila. The map mounts only once the dialog is open, so it measures its real size.
import { Check, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { LocationMap, type MapCenter } from "./location-map";

type LocationSheetProps = {
    start: MapCenter | null;
    onConfirm: (center: MapCenter) => void;
    onClose: () => void;
};

const METRO_MANILA: MapCenter = { latitude: 14.5995, longitude: 120.9842 };
const CITY_ZOOM = 12;
const STREET_ZOOM = 15;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function LocationSheet({ start, onConfirm, onClose }: LocationSheetProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [initialCenter] = useState<MapCenter>(start ?? METRO_MANILA);
    const centerRef = useRef<MapCenter>(initialCenter);
    const [opener] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null));
    const [open, setOpen] = useState(false);

    // open as a modal on mount; on unmount close it and hand focus back to the opener
    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog) {
            return;
        }

        if (!dialog.open) {
            dialog.showModal();
        }

        setOpen(true);

        return () => {
            if (dialog.open) {
                dialog.close();
            }

            opener?.focus();
        };
    }, [opener]);

    // a tap on the backdrop lands on the dialog itself
    function handleDialogClick(event: MouseEvent<HTMLDialogElement>) {
        if (event.target === event.currentTarget) {
            onClose();
        }
    }

    // Tab and Shift+Tab wrap at the ends, so focus never leaves the sheet
    function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
        if (event.key !== "Tab") {
            return;
        }

        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
        const first = items[0];
        const last = items[items.length - 1];

        if (!first || !last) {
            return;
        }

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    function handleConfirm() {
        onConfirm(centerRef.current);
    }

    return (
        <dialog
            ref={dialogRef}
            className="send-sheet"
            aria-labelledby="send-sheet-title"
            aria-describedby="send-sheet-note"
            onClose={onClose}
            onClick={handleDialogClick}
            onKeyDown={handleKeyDown}
        >
            {/* sheet section */}
            <section className="section send-sheet-body">
                {/* heading */}
                <div className="sub-section">
                    <div className="placement send-sheet-head">
                        <div className="container">
                            <h2 id="send-sheet-title" className="send-sheet-title">
                                Place a pin
                            </h2>
                        </div>
                        <div className="container">
                            <button className="send-icon-btn" type="button" aria-label="Close" onClick={onClose}>
                                <X weight="bold" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    <div className="placement auth-stack">
                        <div className="container">
                            <p id="send-sheet-note" className="auth-note">
                                Move the map until the pin sits on the place. It is rounded to about 150 m.
                            </p>
                        </div>
                    </div>
                </div>

                {/* map */}
                <div className="sub-section send-sheet-map">
                    <div className="placement auth-stack send-grow">
                        <div className="container send-grow">
                            {open ? (
                                <LocationMap
                                    initialCenter={initialCenter}
                                    initialZoom={start ? STREET_ZOOM : CITY_ZOOM}
                                    onCenterChange={(center) => {
                                        centerRef.current = center;
                                    }}
                                />
                            ) : null}
                        </div>
                    </div>
                </div>

                {/* confirm */}
                <div className="sub-section">
                    <div className="placement auth-stack">
                        <div className="container">
                            <button className="auth-btn auth-btn-ink" type="button" onClick={handleConfirm}>
                                <Check weight="bold" aria-hidden="true" />
                                Use this spot
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </dialog>
    );
}
