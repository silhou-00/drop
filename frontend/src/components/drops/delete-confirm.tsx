// The in-page step before a drop is deleted. It takes the place of the action row and asks
// once, plainly, with Delete and Cancel side by side, and moves focus to Cancel when it appears
// so a stray Enter does not delete. While the delete runs both buttons are off. The page owns
// the delete; a failure shows as text here.
import { Trash } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

type DeleteConfirmProps = {
    pending: boolean;
    error: string;
    onConfirm: () => void;
    onCancel: () => void;
};

export function DeleteConfirm({ pending, error, onConfirm, onCancel }: DeleteConfirmProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        cancelRef.current?.focus();
    }, []);

    return (
        <div className="sub-section inbox-confirm" role="group" aria-labelledby="inbox-confirm-title">
            {/* question */}
            <div className="placement auth-stack">
                <div className="container">
                    <p id="inbox-confirm-title" className="inbox-confirm-title">
                        Delete this drop? This cannot be undone.
                    </p>
                </div>
                <div className="container">
                    <p className="auth-error" role="alert">
                        {error}
                    </p>
                </div>
            </div>

            {/* answers */}
            <div className="placement inbox-actions">
                <div className="container inbox-grow">
                    <button className="auth-btn inbox-btn-danger" type="button" disabled={pending} onClick={onConfirm}>
                        {pending ? (
                            <span className="auth-spin" aria-hidden="true" />
                        ) : (
                            <Trash weight="bold" aria-hidden="true" />
                        )}
                        {pending ? "Deleting" : "Delete"}
                    </button>
                </div>
                <div className="container inbox-grow">
                    <button
                        className="auth-btn auth-btn-paper"
                        type="button"
                        disabled={pending}
                        ref={cancelRef}
                        onClick={onCancel}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
