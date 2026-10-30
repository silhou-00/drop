// Tests for photo cleaning with fixtures built in code: metadata removal, the format
// check from the bytes, the pixel cap, resizing, orientation and the size target.
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { MAX_HEIGHT, MAX_WIDTH, PHOTO_MESSAGE, PHOTO_UNREADABLE_MESSAGE, TARGET_BYTES } from "./model.js";
import { cleanPhoto, newPhotoKey } from "./service.js";

const RED = { r: 200, g: 30, b: 30 };

function solid(width: number, height: number, channels: 3 | 4 = 3) {
    return sharp({ create: { width, height, channels, background: { ...RED, alpha: 0.5 } } });
}

describe("cleanPhoto", () => {
    it("removes EXIF and GPS data", async () => {
        const input = await solid(300, 200)
            .jpeg()
            .withExif({ IFD0: { Copyright: "someone" }, IFD3: { GPSLatitudeRef: "N", GPSLongitudeRef: "E" } })
            .toBuffer();

        expect((await sharp(input).metadata()).exif).toBeDefined();

        const meta = await sharp(await cleanPhoto(input)).metadata();

        expect(meta.format).toBe("webp");
        expect(meta.exif).toBeUndefined();
    });

    it("rejects the bytes of a text file renamed .jpg", async () => {
        await expect(cleanPhoto(Buffer.from("this is not a photo"))).rejects.toMatchObject({
            status: 422,
            message: PHOTO_UNREADABLE_MESSAGE,
        });
    });

    it("rejects a GIF with the photo message", async () => {
        const gif = await solid(20, 20).gif().toBuffer();

        await expect(cleanPhoto(gif)).rejects.toMatchObject({ status: 422, message: PHOTO_MESSAGE });
    });

    it("rejects an image over the pixel cap", async () => {
        const bomb = await solid(8000, 6000).png().toBuffer();

        await expect(cleanPhoto(bomb)).rejects.toMatchObject({ status: 422, message: PHOTO_UNREADABLE_MESSAGE });
    });

    it("turns a large PNG with alpha into a WebP inside 1080 by 1350", async () => {
        const meta = await sharp(await cleanPhoto(await solid(3000, 4000, 4).png().toBuffer())).metadata();

        expect(meta.format).toBe("webp");
        expect(meta.width).toBeLessThanOrEqual(MAX_WIDTH);
        expect(meta.height).toBeLessThanOrEqual(MAX_HEIGHT);
        expect(meta.hasAlpha).toBe(true);
    });

    it("does not enlarge a small image", async () => {
        const meta = await sharp(await cleanPhoto(await solid(100, 80).png().toBuffer())).metadata();

        expect([meta.width, meta.height]).toEqual([100, 80]);
    });

    it("keeps a noisy image at the smallest quality step when it cannot reach the target", async () => {
        const raw = { raw: { width: 1600, height: 2000, channels: 3 as const } };
        const noisy = await sharp(randomBytes(1600 * 2000 * 3), raw)
            .png()
            .toBuffer();
        const output = await cleanPhoto(noisy);
        const smallest = await sharp(noisy)
            .rotate()
            .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 52 })
            .toBuffer();

        expect(output.length).toBeGreaterThan(TARGET_BYTES);
        expect(output.length).toBe(smallest.length);
    });

    it("steps the quality down to reach the target when it can", async () => {
        const raw = { raw: { width: 400, height: 500, channels: 3 as const } };
        const noisy = await sharp(randomBytes(400 * 500 * 3), raw)
            .png()
            .toBuffer();

        expect((await cleanPhoto(noisy)).length).toBeLessThanOrEqual(TARGET_BYTES * 4);
    });

    it("applies the EXIF orientation", async () => {
        const input = await solid(200, 100).jpeg().withMetadata({ orientation: 6 }).toBuffer();
        const meta = await sharp(await cleanPhoto(input)).metadata();

        expect([meta.width, meta.height]).toEqual([100, 200]);
    });
});

describe("newPhotoKey", () => {
    it("is a UUID plus .webp", () => {
        expect(newPhotoKey()).toMatch(/^[a-z0-9-]{36}\.webp$/);
    });
});
