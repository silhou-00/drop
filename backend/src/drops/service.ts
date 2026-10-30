// Business rules for drops. Sending runs a fixed order: find the recipient, check the
// send limits, validate the input, clean the photo, round the location, look up a place
// name, store the photo, then insert. Only the rounded cell centre ever reaches the
// repository. A photo saved before a failed insert is removed again. The inbox side
// resolves the signed-in user's profile first, then lists (with the filter and the
// unread count), reads, marks, deletes and serves the photo of drops that belong to it.
// A drop that is missing, malformed or someone else's gets the same 404.
import { usernameSchema, type Profile } from "../profiles/model.js";
import { AppError } from "../shared/errors.js";
import { snapToGrid, type SnappedPoint } from "../shared/geo.js";
import type { FileStore } from "../shared/storage/model.js";
import type { KeyMaker } from "./keys.js";
import type { SendLimiter } from "./limits.js";
import {
    LINK_PAUSED_MESSAGE,
    dropIdSchema,
    encodeCursor,
    sendDropSchema,
    toInboxItem,
    type InboxItem,
    type InboxQuery,
} from "./model.js";
import type { DropRepository, InsertDropResult } from "./repository.js";

type Dependencies = {
    findOwnProfile: (userId: string) => Promise<Pick<Profile, "id"> | null>;
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

export type InboxPage = {
    items: InboxItem[];
    next_cursor: string | null;
    unread_count: number;
};

function notFound() {
    return new AppError(404, "NOT_FOUND", "Not found");
}

function paused() {
    return new AppError(409, "LINK_PAUSED", LINK_PAUSED_MESSAGE);
}

export function createDropService({
    findOwnProfile,
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

    // profile of the signed-in user, 404 when there is none
    async function ownProfileId(userId: string): Promise<string> {
        const profile = await findOwnProfile(userId);

        if (!profile) {
            throw notFound();
        }

        return profile.id;
    }

    // a malformed id gets the same 404 as a missing drop
    function parseId(id: string): string {
        const parsed = dropIdSchema.safeParse(id);

        if (!parsed.success) {
            throw notFound();
        }

        return parsed.data;
    }

    async function listInbox(userId: string, { limit, cursor, filter }: InboxQuery): Promise<InboxPage> {
        const profileId = await ownProfileId(userId);
        const [rows, unreadCount] = await Promise.all([
            drops.listForRecipient(profileId, limit, cursor, filter),
            drops.countUnread(profileId),
        ]);
        const page = rows.slice(0, limit);
        const last = page[page.length - 1];

        return {
            items: page.map(toInboxItem),
            next_cursor: rows.length > limit && last ? encodeCursor({ createdAt: last.cursorAt, id: last.id }) : null,
            unread_count: unreadCount,
        };
    }

    async function getDrop(userId: string, id: string): Promise<InboxItem> {
        const dropId = parseId(id);
        const profileId = await ownProfileId(userId);
        const row = await drops.findForRecipient(profileId, dropId);

        if (!row) {
            throw notFound();
        }

        return toInboxItem(row);
    }

    async function markRead(userId: string, id: string, isRead: boolean): Promise<InboxItem> {
        const dropId = parseId(id);
        const profileId = await ownProfileId(userId);
        const row = await drops.setRead(profileId, dropId, isRead);

        if (!row) {
            throw notFound();
        }

        return toInboxItem(row);
    }

    // the row goes first; a file that cannot be removed is logged without its key
    async function deleteDrop(userId: string, id: string): Promise<void> {
        const dropId = parseId(id);
        const profileId = await ownProfileId(userId);
        const removed = await drops.deleteForRecipient(profileId, dropId);

        if (!removed) {
            throw notFound();
        }

        if (removed.photoKey) {
            try {
                await store.remove(removed.photoKey);
            } catch {
                console.error("Photo file could not be removed");
            }
        }
    }

    async function readPhoto(userId: string, id: string): Promise<Buffer> {
        const dropId = parseId(id);
        const profileId = await ownProfileId(userId);
        const row = await drops.findForRecipient(profileId, dropId);

        if (!row || !row.photoKey) {
            throw notFound();
        }

        // a file gone from disk is the same as no photo
        try {
            return await store.read(row.photoKey);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                throw notFound();
            }

            throw error;
        }
    }

    return { sendDrop, listInbox, getDrop, markRead, deleteDrop, readPhoto };
}

export type DropService = ReturnType<typeof createDropService>;
