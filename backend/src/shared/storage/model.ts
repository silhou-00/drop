// File storage contract. Features save, read and remove private files by key without
// knowing where the bytes live. The local disk store implements it for development;
// a hosted store can replace it before deploy without touching the callers.
export type FileStore = {
    save: (key: string, bytes: Buffer) => Promise<void>;
    read: (key: string) => Promise<Buffer>;
    remove: (key: string) => Promise<void>;
};
