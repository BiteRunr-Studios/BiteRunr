// app.config.ts
import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
    name: "BiteRunr",
    slug: "BiteRunr",
    scheme: "biterunr",
    ios: {
        bundleIdentifier: "com.RunrStudios.BiteRunrKMP",
    },
    android: {
        package: "com.RunrStudios.BiteRunrKMP",
        intentFilters: [
            {
                action: "VIEW",
                data: [{ scheme: "biterunr", host: "auth", pathPrefix: "/callback" }],
                category: ["BROWSABLE", "DEFAULT"],
            },
        ],
    },
};
export default config;
