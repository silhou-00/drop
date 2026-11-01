// Connection string clean-up for a pinned certificate. node-postgres lets ssl settings in
// the URL override the ssl option, so they are removed before the certificate is applied.
// Shared by the app's pool and the Drizzle Kit config.
const SSL_PARAMS = ["ssl", "sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"];

export function withoutSslParams(url: string): string {
    const parsed = new URL(url);

    for (const name of SSL_PARAMS) {
        parsed.searchParams.delete(name);
    }

    return parsed.toString();
}
