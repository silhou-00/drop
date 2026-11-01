// File storage contract. Features save, read and remove private files by key without
// knowing where the bytes live. The local disk store serves development and the
// Supabase store serves production. Reading a missing file throws an error with code ENOENT.
export type FileStore = {
    save: (key: string, bytes: Buffer) => Promise<void>;
    read: (key: string) => Promise<Buffer>;
    remove: (key: string) => Promise<void>;
};
