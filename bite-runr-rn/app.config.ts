// app.config.ts
import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
    name: "BiteRunr",
    slug: "biterunr",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "biterunr",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
        bundleIdentifier: "com.RunrStudios.BiteRunrRN",
        supportsTablet: true,
        appleTeamId: "6K8R8337BL",
        icon: {
            dark: "./assets/images/icon-dark.png",
            light: "./assets/images/icon.png",
        },
        splash: {
            image: "./assets/images/splash-screen-icon.png",
            resizeMode: "contain",
            backgroundColor: "#FFFFFF",
            dark: {
                image: "./assets/images/splash-screen-icon.png",
                resizeMode: "contain",
                backgroundColor: "#000000",
            },
        },
        infoPlist: {
            NSPhotoLibraryUsageDescription:
                "We need access to your photo library to let you choose a profile picture.",
            NSPhotoLibraryAddUsageDescription:
                "We need to save photos to your library (optional).",
        },
    },
    android: {
        adaptiveIcon: {
            backgroundColor: "#E6F4FE",
            foregroundImage: "./assets/images/android-icon-foreground.png",
            backgroundImage: "./assets/images/android-icon-background.png",
            monochromeImage: "./assets/images/android-icon-monochrome.png",
        },
        icon: "./assets/images/icon.png",
        splash: {
            image: "./assets/images/splash-screen-icon.png",
            resizeMode: "contain",
            backgroundColor: "#FFFFFF",
            dark: {
                image: "./assets/images/splash-screen-icon.png",
                resizeMode: "contain",
                backgroundColor: "#000000",
            },
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        package: "com.RunrStudios.BiteRunrRN",
        permissions: ["READ_MEDIA_IMAGES", "READ_EXTERNAL_STORAGE"],
    },
    web: {
        output: "static",
        favicon: "./assets/images/favicon.png",
    },
    plugins: ["expo-router"],
    experiments: {
        typedRoutes: true,
        reactCompiler: true,
    },
};

export default config;
