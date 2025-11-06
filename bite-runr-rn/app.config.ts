// app.config.ts
import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
    name: "BiteRunr",
    slug: "biterunr",
    scheme: "biterunr",
    ios: {
        bundleIdentifier: "com.RunrStudios.BiteRunrRN",
    },
    android: {
        package: "com.RunrStudios.BiteRunrRN",
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
