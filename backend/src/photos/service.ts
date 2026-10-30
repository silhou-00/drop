// Photo cleaning. Takes the uploaded bytes and returns a WebP with no metadata, so GPS
// and camera data never reach storage. The format is read from the bytes, never from
// the filename or the declared type. Only the first frame of an animated image is kept.
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AppError } from "../shared/errors.js";
import {
    MAX_HEIGHT,
    MAX_INPUT_PIXELS,
    MAX_WIDTH,
    PHOTO_MESSAGE,
    PHOTO_UNREADABLE_MESSAGE,
    TARGET_BYTES,
} from "./model.js";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const QUALITY_STEPS = [82, 72, 62, 52];

function unreadable() {
    return new AppError(422, "VALIDATION_ERROR", PHOTO_UNREADABLE_MESSAGE);
}

// one pass at a given quality; rotate applies the EXIF orientation
function encode(bytes: Buffer, quality: number): Promise<Buffer> {
    return sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, pages: 1 })
        .rotate()
        .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
}

export async function cleanPhoto(bytes: Buffer): Promise<Buffer> {
    let format: string | undefined;

    try {
        format = (await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS }).metadata()).format;
    } catch {
        throw unreadable();
    }

    if (!format || !ALLOWED_FORMATS.has(format)) {
        throw new AppError(422, "VALIDATION_ERROR", PHOTO_MESSAGE);
    }

    try {
        let smallest: Buffer | null = null;

        for (const quality of QUALITY_STEPS) {
            const output = await encode(bytes, quality);

            if (!smallest || output.length < smallest.length) {
                smallest = output;
            }

            if (output.length <= TARGET_BYTES) {
                break;
            }
        }

        return smallest as Buffer;
    } catch {
        throw unreadable();
    }
}

export function newPhotoKey(): string {
    return `${randomUUID()}.webp`;
}
