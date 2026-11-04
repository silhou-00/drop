// Link preview routes. Answer GET /:username with the built index.html filled with Open
// Graph tags for that profile, and every other page, the home page included, with the site
// card. Static files are served before these routes, so only page addresses reach them.
import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import { AppError } from "../shared/errors.js";
import type { PublicProfile } from "../profiles/service.js";
import { renderProfilePage, renderSitePage } from "./service.js";

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

    // every other page, the home page included, gets the site card
    router.get("*", async (c, next) => {
        const html = await loadTemplate();

        if (html === null) {
            return next();
        }

        c.header("Cache-Control", "no-cache");

        return c.html(renderSitePage(html, origin));
    });

    return router;
}
