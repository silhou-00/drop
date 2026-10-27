// Vite build and dev server for the Drop web app. TanStack Router generates the
// route tree from src/routes, and /api calls are forwarded to the backend in dev.
// The tweak hook import resolves to the live-controls version on the dev server and
// to the plain defaults version in a production build, so the panel never ships.
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ command }) => {
    const tweaksFile = command === "serve" ? "use-tweaks.dev.ts" : "use-tweaks.prod.ts";

    return {
        plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
        resolve: {
            alias: [
                {
                    find: /^@\/lib\/tweaks\/use-tweaks$/,
                    replacement: path.resolve(__dirname, "./src/lib/tweaks", tweaksFile),
                },
                { find: "@", replacement: path.resolve(__dirname, "./src") },
            ],
        },
        server: {
            proxy: {
                "/api": "http://localhost:3000",
            },
        },
    };
});
