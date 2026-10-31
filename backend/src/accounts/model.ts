// Input rule for deleting an account. The person types their link name to confirm, and
// the server checks it again. The message is exported so the frontend shows the same text.
import { z } from "zod";

export const CONFIRM_MESSAGE = "Type your link name to confirm.";

export const deleteAccountSchema = z.strictObject({
    username: z.string(CONFIRM_MESSAGE).trim().toLowerCase().min(1, CONFIRM_MESSAGE).max(30, CONFIRM_MESSAGE),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
