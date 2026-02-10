// app.config.ts
import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
    name: "BiteRunr",
    owner: "ryansomers",
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
    },
    web: {
        output: "static",
        favicon: "./assets/images/favicon.png",
    },
    plugins: [
        "expo-router",
        [
            "expo-image-picker",
            {
                photosPermission:
                    "Allow $(PRODUCT_NAME) to access your photos to set your profile picture.",
            },
        ],
        [
            "expo-notifications",
            {
                icon: "./assets/images/icon.png",
                color: "#E6F4FE",
            },
        ],
        [
            "expo-camera",
            {
                cameraPermission:
                    "Allow $(PRODUCT_NAME) to access your camera to scan QR codes for joining group orders.",
            },
        ],
        [
            "@stripe/stripe-react-native",
            {
                enableGooglePay: true,
            },
        ],
    ],
    experiments: {
        typedRoutes: true,
        reactCompiler: true,
    },
    extra: {
        eas: {
            projectId: "e77fef75-c90d-4ad7-b842-f01927d4bd9d",
        },
    },
};

export default config;
