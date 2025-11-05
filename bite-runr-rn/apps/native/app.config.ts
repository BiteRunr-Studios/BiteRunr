// app.config.ts
import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
    name: "BiteRunr",
    slug: "biterunr",
    scheme: "biterunr",
    ios: {
        bundleIdentifier: "com.RunrStudios.biterunr",
    },
    android: {
        package: "com.RunrStudios.biterunr",
        intentFilters: [
            {
                action: "VIEW",
                data: [
                    { scheme: "biterunr", host: "auth", pathPrefix: "/callback" }
                ],
                category: ["BROWSABLE", "DEFAULT"],
            },
        ],
    },
};

export default config;
