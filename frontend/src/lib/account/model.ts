// Rules for deleting an account. The owner types their link name to confirm. The message is
// copied from backend/src/accounts/model.ts and must stay in step with it, so a wrong name
// fails with the same text on both sides. The server checks the name again.

export const CONFIRM_MESSAGE = "Type your link name to confirm.";

// true when the typed name is the owner's link name, ignoring case and outer spaces
export function matchesUsername(input: string, username: string): boolean {
    return input.trim().toLowerCase() === username.toLowerCase();
}
