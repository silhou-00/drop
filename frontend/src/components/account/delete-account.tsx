// The in-page step before an account is deleted, opened from the Settings page. It says
// plainly what goes, then asks the owner to type their link name. Delete stays off until the
// name matches and while the request runs, and focus moves to Cancel when the panel opens so a
// stray Enter does not delete. The page owns the delete; a failure shows here as text.
import { Trash } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CONFIRM_MESSAGE, matchesUsername } from "@/lib/account/model";
import { USERNAME_MAX } from "@/lib/profiles/model";

type DeleteAccountProps = {
    username: string;
    pending: boolean;
    error: string;
    onConfirm: (typed: string) => void;
    onCancel: () => void;
};

export function DeleteAccount({ username, pending, error, onConfirm, onCancel }: DeleteAccountProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    const [typed, setTyped] = useState("");
    const [mismatch, setMismatch] = useState(false);
    const matches = matchesUsername(typed, username);
    const shown = error || (mismatch ? CONFIRM_MESSAGE : "");
    const consequences = [
        `Your link ${window.location.host}/${username} stops working right away.`,
        "Every drop sent to you is deleted, with its photos and places.",
        "Your statements are deleted.",
        "You are signed out on every device.",
        "Your link name stays locked for 30 days. After that, anyone can claim it.",
        "This cannot be undone.",
    ];

    useEffect(() => {
        cancelRef.current?.focus();
    }, []);

    // the name is checked here first; the server checks it again
    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (pending) {
            return;
        }

        if (!matches) {
            setMismatch(true);

            return;
        }

        onConfirm(typed.trim());
    }

    return (
        <form
            id="delete-account-panel"
            className="sub-section settings-confirm"
            aria-labelledby="delete-account-title"
            noValidate
            onSubmit={handleSubmit}
        >
            {/* what goes */}
            <div className="placement auth-stack">
                <div className="container">
                    <h2 id="delete-account-title" className="settings-confirm-title">
                        Delete your account?
                    </h2>
                </div>
                <div className="container">
                    <ul className="settings-confirm-list">
                        {consequences.map((line) => (
                            <li key={line}>{line}</li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* name field */}
            <div className="placement auth-stack">
                <div className="container">
                    <label className="auth-label" htmlFor="delete-account-name">
                        Type {username} to confirm
                    </label>
                </div>
                <div className="container">
                    <input
                        id="delete-account-name"
                        className="auth-input"
                        name="username"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        maxLength={USERNAME_MAX}
                        value={typed}
                        disabled={pending}
                        aria-describedby="delete-account-msg"
                        onChange={(event) => {
                            setTyped(event.target.value);
                            setMismatch(false);
                        }}
                    />
                </div>
                <div className="container">
                    <p id="delete-account-msg" className="auth-error" role="alert">
                        {shown}
                    </p>
                </div>
            </div>

            {/* answers */}
            <div className="placement settings-confirm-actions">
                <div className="container">
                    <button className="auth-btn settings-btn-danger" type="submit" disabled={!matches || pending}>
                        {pending ? (
                            <span className="auth-spin" aria-hidden="true" />
                        ) : (
                            <Trash weight="bold" aria-hidden="true" />
                        )}
                        {pending ? "Deleting" : "Delete account"}
                    </button>
                </div>
                <div className="container">
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
        </form>
    );
}
