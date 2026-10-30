// Tests for the inbox side of the drop service with an in-memory repository: ownership,
// the shared 404, paging with the cursor, the filter and the unread count, mark read, delete with its file (and a file
// failure that is swallowed), and the photo read.
import { describe, expect, it } from "vitest";
import { createKeyMaker } from "./keys.js";
import { createSendLimiter } from "./limits.js";
import { inboxQuerySchema, type DropRow } from "./model.js";
import type { DropRepository, ListedDropRow } from "./repository.js";
import { createDropService } from "./service.js";

const USER = "user-1";
const PROFILE = "profile-1";
const OTHER_PROFILE = "profile-2";
const DROP_A = "11111111-1111-4111-8111-111111111111";
const DROP_B = "22222222-2222-4222-8222-222222222222";
const DROP_C = "33333333-3333-4333-8333-333333333333";
const FOREIGN = "44444444-4444-4444-8444-444444444444";
const MISSING = "55555555-5555-4555-8555-555555555555";
const PHOTO_KEY = "123e4567-e89b-42d3-a456-426614174000.webp";

function row(id: string, recipientId: string, photoKey: string | null, minute: number): DropRow {
    return {
        id,
        recipientId,
        message: `drop ${minute}`,
        location: { lng: 120.9842, lat: 14.5995 },
        locationSource: "gps",
        locationName: "Diliman",
        photoKey,
        senderKey: "a".repeat(64),
        deviceKey: null,
        isRead: false,
        createdAt: new Date(Date.UTC(2026, 9, 30, 12, minute)),
    };
}

type Options = {
    removeError?: Error;
    readError?: Error;
    profile?: boolean;
};

// the repository keeps the recipient filter and the newest-first order
function build(initial: DropRow[], options: Options = {}) {
    const rows = [...initial];
    const removed: string[] = [];
    const read: string[] = [];
    const filters: string[] = [];
    const drops: DropRepository = {
        insertDrop: async () => "inserted",
        listForRecipient: async (profileId, limit, cursor, filter) => {
            filters.push(filter);

            const mine = rows
                .filter((item) => item.recipientId === profileId)
                .filter((item) => (filter === "unread" ? !item.isRead : filter === "photos" ? item.photoKey : true))
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            const start = cursor ? mine.findIndex((item) => item.id === cursor.id) + 1 : 0;

            return mine.slice(start, start + limit + 1).map((item): ListedDropRow => ({
                ...item,
                cursorAt: item.createdAt.toISOString().replace("Z", "000Z"),
            }));
        },
        countUnread: async (profileId) => {
            return rows.filter((item) => item.recipientId === profileId && !item.isRead).length;
        },
        findForRecipient: async (profileId, id) => {
            return rows.find((item) => item.recipientId === profileId && item.id === id) ?? null;
        },
        setRead: async (profileId, id, isRead) => {
            const found = rows.find((item) => item.recipientId === profileId && item.id === id);

            if (found) {
                found.isRead = isRead;
            }

            return found ?? null;
        },
        deleteForRecipient: async (profileId, id) => {
            const index = rows.findIndex((item) => item.recipientId === profileId && item.id === id);

            if (index === -1) {
                return null;
            }

            const [gone] = rows.splice(index, 1);

            return { photoKey: gone.photoKey };
        },
    };
    const service = createDropService({
        findOwnProfile: async (userId) => (options.profile === false || userId !== USER ? null : { id: PROFILE }),
        findRecipient: async () => null,
        drops,
        limiter: createSendLimiter(),
        keys: createKeyMaker("s".repeat(40)),
        lookupPlaceName: async () => null,
        store: {
            save: async () => {},
            read: async (key) => {
                read.push(key);

                if (options.readError) {
                    throw options.readError;
                }

                return Buffer.from("webp-bytes");
            },
            remove: async (key) => {
                if (options.removeError) {
                    throw options.removeError;
                }

                removed.push(key);
            },
        },
        cleanPhoto: async (bytes) => bytes,
        newPhotoKey: () => PHOTO_KEY,
    });

    return { service, removed, read, filters };
}

const query = (input: Record<string, string> = {}) => inboxQuerySchema.parse(input);

const rows = [
    row(DROP_A, PROFILE, null, 1),
    row(DROP_B, PROFILE, PHOTO_KEY, 2),
    row(DROP_C, PROFILE, null, 3),
    row(FOREIGN, OTHER_PROFILE, PHOTO_KEY, 4),
];

describe("inbox service", () => {
    it("answers 404 when the user has no profile", async () => {
        const { service } = build(rows, { profile: false });

        await expect(service.listInbox(USER, query())).rejects.toMatchObject({ status: 404 });
        await expect(service.getDrop(USER, DROP_A)).rejects.toMatchObject({ status: 404 });
    });

    it("lists only the caller's drops, newest first, in the inbox shape", async () => {
        const page = await build(rows).service.listInbox(USER, query());

        expect(page.items.map((item) => item.id)).toEqual([DROP_C, DROP_B, DROP_A]);
        expect(page.next_cursor).toBeNull();
        expect(page.items[1]).toEqual({
            id: DROP_B,
            message: "drop 2",
            location: { lat: 14.5995, lng: 120.9842, name: "Diliman", source: "gps" },
            has_photo: true,
            is_read: false,
            created_at: "2026-10-30T12:02:00.000Z",
        });
    });

    it("pages with an opaque cursor and ends with a null cursor", async () => {
        const { service } = build(rows);
        const first = await service.listInbox(USER, query({ limit: "2" }));

        expect(first.items.map((item) => item.id)).toEqual([DROP_C, DROP_B]);
        expect(first.next_cursor).toMatch(/^[A-Za-z0-9_-]+$/);

        const second = await service.listInbox(USER, query({ limit: "2", cursor: first.next_cursor ?? "" }));

        expect(second.items.map((item) => item.id)).toEqual([DROP_A]);
        expect(second.next_cursor).toBeNull();
    });

    it("gives a null cursor when the last page is exactly full", async () => {
        const page = await build(rows).service.listInbox(USER, query({ limit: "3" }));

        expect(page.items).toHaveLength(3);
        expect(page.next_cursor).toBeNull();
    });

    it("passes the filter to the repository and defaults it to all", async () => {
        const { service, filters } = build(rows);

        await service.listInbox(USER, query());
        await service.listInbox(USER, query({ filter: "unread" }));
        await service.listInbox(USER, query({ filter: "photos" }));

        expect(filters).toEqual(["all", "unread", "photos"]);
    });

    it("filters to unread drops and to drops with a photo", async () => {
        const { service } = build(rows.map((item) => ({ ...item })));

        await service.markRead(USER, DROP_C, true);

        const unread = await service.listInbox(USER, query({ filter: "unread" }));
        const photos = await service.listInbox(USER, query({ filter: "photos" }));

        expect(unread.items.map((item) => item.id)).toEqual([DROP_B, DROP_A]);
        expect(photos.items.map((item) => item.id)).toEqual([DROP_B]);
    });

    it("reports the caller's unread count whatever the filter", async () => {
        const { service } = build(rows.map((item) => ({ ...item })));

        expect((await service.listInbox(USER, query())).unread_count).toBe(3);
        expect((await service.listInbox(USER, query({ filter: "photos" }))).unread_count).toBe(3);
        expect((await service.listInbox(USER, query({ limit: "1" }))).unread_count).toBe(3);

        await service.markRead(USER, DROP_A, true);

        expect((await service.listInbox(USER, query({ filter: "unread" }))).unread_count).toBe(2);
    });

    it("answers the same 404 for a missing drop, another user's drop and a bad id", async () => {
        const { service } = build(rows);

        for (const id of [FOREIGN, MISSING, "not-an-id"]) {
            await expect(service.getDrop(USER, id)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
            await expect(service.markRead(USER, id, true)).rejects.toMatchObject({ status: 404 });
            await expect(service.deleteDrop(USER, id)).rejects.toMatchObject({ status: 404 });
            await expect(service.readPhoto(USER, id)).rejects.toMatchObject({ status: 404 });
        }
    });

    it("marks a drop read and unread", async () => {
        const { service } = build(rows);

        expect((await service.markRead(USER, DROP_A, true)).is_read).toBe(true);
        expect((await service.getDrop(USER, DROP_A)).is_read).toBe(true);
        expect((await service.markRead(USER, DROP_A, false)).is_read).toBe(false);
    });

    it("deletes the row, then removes the photo file", async () => {
        const { service, removed } = build(rows);

        await service.deleteDrop(USER, DROP_B);

        expect(removed).toEqual([PHOTO_KEY]);
        await expect(service.getDrop(USER, DROP_B)).rejects.toMatchObject({ status: 404 });
    });

    it("deletes a drop without a photo and touches no file", async () => {
        const { service, removed } = build(rows);

        await service.deleteDrop(USER, DROP_A);

        expect(removed).toEqual([]);
    });

    it("swallows a file remove failure and logs without the key", async () => {
        const { service } = build(rows, { removeError: new Error(`disk fault ${PHOTO_KEY}`) });
        const logged: unknown[][] = [];
        const original = console.error;

        console.error = (...args: unknown[]) => {
            logged.push(args);
        };

        try {
            await expect(service.deleteDrop(USER, DROP_B)).resolves.toBeUndefined();
        } finally {
            console.error = original;
        }

        expect(logged).toHaveLength(1);
        expect(JSON.stringify(logged)).not.toContain(PHOTO_KEY);
    });

    it("reads the photo for the owner and answers 404 for a drop without one", async () => {
        const { service, read } = build(rows);

        expect((await service.readPhoto(USER, DROP_B)).toString()).toBe("webp-bytes");
        expect(read).toEqual([PHOTO_KEY]);
        await expect(service.readPhoto(USER, DROP_A)).rejects.toMatchObject({ status: 404 });
    });

    it("answers 404 when the photo file is missing from disk", async () => {
        const missing = Object.assign(new Error("gone"), { code: "ENOENT" });
        const { service } = build(rows, { readError: missing });

        await expect(service.readPhoto(USER, DROP_B)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    });

    it("lets other read errors fall through", async () => {
        const { service } = build(rows, { readError: new Error("disk failure") });

        await expect(service.readPhoto(USER, DROP_B)).rejects.toThrow("disk failure");
    });
});
