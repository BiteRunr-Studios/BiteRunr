import { defineConfig } from "@solidjs/start/config";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    vite: {
        plugins: [
            tailwindcss(),
            VitePWA({
                registerType: "autoUpdate",
                manifest: {
                    name: "BiteRunr",
                    short_name: "BiteRunr",
                    start_url: "/",
                    display: "standalone",
                    background_color: "#ffffff",
                    theme_color: "#ff8904",
                    scope: "/",
                    icons: [
                        {
                            src: "logo.png",
                            sizes: "192x192",
                            type: "image/png",
                        },
                        {
                            src: "logo.png",
                            sizes: "512x512",
                            type: "image/png",
                        },
                    ],
                },
            }),
        ],
    },
});
