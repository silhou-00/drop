// Photo rules. The limits and error messages are exported as constants so the frontend
// can show the same text for the same failure. Output is always a WebP no larger than
// 1080 by 1350 pixels.
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PHOTO_MESSAGE = "Use a JPEG, PNG or WebP photo up to 8 MB.";
export const PHOTO_UNREADABLE_MESSAGE = "That photo could not be read.";

export const MAX_INPUT_PIXELS = 40_000_000;
export const MAX_WIDTH = 1080;
export const MAX_HEIGHT = 1350;
export const TARGET_BYTES = 400 * 1024;
