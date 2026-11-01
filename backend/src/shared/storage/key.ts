// File key check shared by every file store. A key must be a UUID plus .webp, so it
// can never carry a path or an unexpected name into a folder or a storage URL.
const KEY_PATTERN = /^[a-z0-9-]{36}\.webp$/;

export function assertValidKey(key: string): void {
    if (!KEY_PATTERN.test(key)) {
        throw new Error("Invalid file key");
    }
}
