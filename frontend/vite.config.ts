// Vite build and dev server for the Drop web app. TanStack Router generates the
// route tree from src/routes, and /api and /tiles calls are forwarded to the backend in dev.
// Environment files are read from the drop-app root. The public contact address is checked
// here: a build without a valid VITE_CONTACT_EMAIL fails, while dev falls back to a
// placeholder with a warning, so a config reload never breaks a running dev server.
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const ENV_DIR = path.resolve(__dirname, "..");
const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const DEV_CONTACT_EMAIL = "privacy@example.invalid";

// the checked contact address for the public pages
function contactEmail(command: string, mode: string) {
    const value = loadEnv(mode, ENV_DIR, "VITE_").VITE_CONTACT_EMAIL ?? "";

    if (EMAIL_PATTERN.test(value)) {
        return value;
    }

    if (command === "build") {
        throw new Error("VITE_CONTACT_EMAIL must be set to a valid email address for a build.");
    }

    console.warn(`VITE_CONTACT_EMAIL is missing or invalid; using ${DEV_CONTACT_EMAIL} in dev.`);

    return DEV_CONTACT_EMAIL;
}

export default defineConfig(({ command, mode }) => ({
    envDir: ENV_DIR,
    define: {
        "import.meta.env.VITE_CONTACT_EMAIL": JSON.stringify(contactEmail(command, mode)),
    },
    plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            "/api": "http://localhost:3000",
            "/tiles": "http://localhost:3000",
        },
    },
}));
