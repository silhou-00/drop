// Business rules for sending a drop. Runs a fixed order: find the recipient, check the
// send limits, validate the input, clean the photo, round the location, look up a place
// name, store the photo, then insert. Only the rounded cell centre ever reaches the
// repository. A photo saved before a failed insert is removed again.
import { usernameSchema, type Profile } from "../profiles/model.js";
import { AppError } from "../shared/errors.js";
import { snapToGrid, type SnappedPoint } from "../shared/geo.js";
import type { FileStore } from "../shared/storage/model.js";
import type { KeyMaker } from "./keys.js";
import type { SendLimiter } from "./limits.js";
import { LINK_PAUSED_MESSAGE, sendDropSchema } from "./model.js";
import type { DropRepository, InsertDropResult } from "./repository.js";

type Dependencies = {
    findRecipient: (username: string) => Promise<Pick<Profile, "id" | "acceptingDrops"> | null>;
    drops: DropRepository;
    limiter: SendLimiter;
    keys: KeyMaker;
    lookupPlaceName: (cell: SnappedPoint) => Promise<string | null>;
    store: FileStore;
    cleanPhoto: (bytes: Buffer) => Promise<Buffer>;
    newPhotoKey: () => string;
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

export function createDropService({
    findRecipient,
    drops,
    limiter,
    keys,
    lookupPlaceName,
    store,
    cleanPhoto,
    newPhotoKey,
}: Dependencies) {
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

        // photo cleaning, before anything is written
        const cleaned = input.photo ? await cleanPhoto(Buffer.from(await input.photo.arrayBuffer())) : null;

        // rounded location and place name
        const cell = snapToGrid(input.latitude, input.longitude);
        const locationName = await lookupPlaceName(cell);

        // photo storage
        const photoKey = cleaned ? newPhotoKey() : null;

        if (cleaned && photoKey) {
            await store.save(photoKey, cleaned);
        }

        // insert, removing the saved photo if the drop is not stored
        let result: InsertDropResult;

        try {
            result = await drops.insertDrop({
                recipientId: recipient.id,
                message: input.message,
                location: { lng: cell.lng, lat: cell.lat },
                locationSource: "gps",
                locationName,
                photoKey,
                senderKey,
                deviceKey,
            });
        } catch (error) {
            if (photoKey) {
                await store.remove(photoKey);
            }

            throw error;
        }

        if (result !== "inserted" && photoKey) {
            await store.remove(photoKey);
        }

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
