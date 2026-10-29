// Vite build and dev server for the Drop web app. TanStack Router generates the
// route tree from src/routes, and /api and /tiles calls are forwarded to the backend in dev.
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
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
});
