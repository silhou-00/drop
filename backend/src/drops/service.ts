// Business rules for sending a drop. Runs a fixed order: find the recipient, check the
// send limits, validate the input, round the location, look up a place name, then insert.
// Only the rounded cell centre ever reaches the repository.
import { usernameSchema, type Profile } from "../profiles/model.js";
import { AppError } from "../shared/errors.js";
import { snapToGrid, type SnappedPoint } from "../shared/geo.js";
import type { KeyMaker } from "./keys.js";
import type { SendLimiter } from "./limits.js";
import { LINK_PAUSED_MESSAGE, sendDropSchema } from "./model.js";
import type { DropRepository } from "./repository.js";

type Dependencies = {
    findRecipient: (username: string) => Promise<Pick<Profile, "id" | "acceptingDrops"> | null>;
    drops: DropRepository;
    limiter: SendLimiter;
    keys: KeyMaker;
    lookupPlaceName: (cell: SnappedPoint) => Promise<string | null>;
};

export type SendDropRequest = {
    username: string;
    ip: string;
    deviceId: string;
    fields: Record<string, unknown>;
};

function notFound() {
    return new AppError(404, "NOT_FOUND", "Not found");
}

function paused() {
    return new AppError(409, "LINK_PAUSED", LINK_PAUSED_MESSAGE);
}

export function createDropService({ findRecipient, drops, limiter, keys, lookupPlaceName }: Dependencies) {
    async function sendDrop({ username, ip, deviceId, fields }: SendDropRequest): Promise<{ delivered: true }> {
        // recipient
        const parsedName = usernameSchema.safeParse(username);
        const recipient = parsedName.success ? await findRecipient(parsedName.data) : null;

        if (!recipient) {
            throw notFound();
        }

        if (!recipient.acceptingDrops) {
            throw paused();
        }

        // rate limits
        const senderKey = keys.senderKey(ip);
        const deviceKey = keys.deviceKey(deviceId);

        limiter.check({ senderKey, deviceKey, recipientId: recipient.id });

        // validation
        const parsed = sendDropSchema.safeParse(fields);

        if (!parsed.success) {
            throw new AppError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
        }

        const input = parsed.data;

        // rounded location and place name
        let location: { lng: number; lat: number } | null = null;
        let locationName: string | null = null;

        if (input.latitude !== undefined && input.longitude !== undefined) {
            const cell = snapToGrid(input.latitude, input.longitude);

            location = { lng: cell.lng, lat: cell.lat };
            locationName = await lookupPlaceName(cell);
        }

        // insert
        const result = await drops.insertDrop({
            recipientId: recipient.id,
            message: input.message,
            location,
            locationSource: location ? (input.location_source ?? null) : null,
            locationName,
            senderKey,
            deviceKey,
        });

        if (result === "missing") {
            throw notFound();
        }

        if (result === "paused") {
            throw paused();
        }

        return { delivered: true };
    }

    return { sendDrop };
}

export type DropService = ReturnType<typeof createDropService>;
