import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "BiteRunr",
        short_name: "BiteRunr",
        description: "BiteRunr",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
            {
                src: "/logo.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/logo.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    };
}
