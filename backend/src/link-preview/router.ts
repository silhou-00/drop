// Link preview route. Answers GET /:username with the built index.html, filled with Open
// Graph tags for that profile. Anything that is not a live profile falls through to the
// next handler, so static files, the SPA fallback and the frontend router stay in charge.
import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import { AppError } from "../shared/errors.js";
import type { PublicProfile } from "../profiles/service.js";
import { renderProfilePage } from "./service.js";

type Options = {
    getPublicProfile: (username: string) => Promise<PublicProfile>;
    templatePath: string;
    origin: string;
};

export function createLinkPreviewRouter({ getPublicProfile, templatePath, origin }: Options) {
    const router = new Hono();
    let template: string | null | undefined;

    // read the template once; null when the frontend is not built
    async function loadTemplate(): Promise<string | null> {
        if (template === undefined) {
            template = await readFile(templatePath, "utf8").catch(() => null);
        }

        return template;
    }

    router.get("/:username", async (c, next) => {
        const html = await loadTemplate();

        if (html === null) {
            return next();
        }

        const profile = await getPublicProfile(c.req.param("username")).catch((error: unknown) => {
            if (error instanceof AppError && error.status === 404) {
                return null;
            }

            throw error;
        });

        if (profile === null) {
            return next();
        }

        c.header("Cache-Control", "no-cache");

        return c.html(renderProfilePage(html, profile, origin));
    });

    return router;
}
