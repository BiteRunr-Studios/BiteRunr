// app.config.ts
import { ExpoConfig } from "expo/config";

type LocalExpoConfig = Partial<
  Pick<ExpoConfig, "owner" | "extra" | "ios" | "android">
>;

let localConfig: LocalExpoConfig = {};
try {
  const maybeLocalConfig = require("./app.config.local");
  localConfig = maybeLocalConfig.default ?? maybeLocalConfig;
} catch {}

const SPLASH_IMAGE = "./assets/images/icon-no-bg.png";
const LIGHT_SPLASH_BACKGROUND = "#FFFFFF";
const DARK_SPLASH_BACKGROUND = "#000000";
const SPLASH_IMAGE_WIDTH = 140;

const config: ExpoConfig = {
  name: "BiteRunr",
  owner: localConfig.owner ?? "",
  slug: "biterunr",
  version: "1.1.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "biterunr",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: localConfig.ios?.bundleIdentifier ?? "",
    supportsTablet: true,
    usesAppleSignIn: localConfig.ios?.usesAppleSignIn ?? false,
    appleTeamId: localConfig.ios?.appleTeamId ?? "",
    icon: {
      dark: "./assets/images/icon-dark.png",
      light: "./assets/images/icon.png",
    },
    splash: {
      image: SPLASH_IMAGE,
      resizeMode: "contain",
      backgroundColor: LIGHT_SPLASH_BACKGROUND,
      dark: {
        image: SPLASH_IMAGE,
        resizeMode: "contain",
        backgroundColor: DARK_SPLASH_BACKGROUND,
      },
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
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
      image: SPLASH_IMAGE,
      resizeMode: "contain",
      backgroundColor: LIGHT_SPLASH_BACKGROUND,
      dark: {
        image: SPLASH_IMAGE,
        resizeMode: "contain",
        backgroundColor: DARK_SPLASH_BACKGROUND,
      },
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package:
      localConfig.android?.package ?? localConfig.ios?.bundleIdentifier ?? "",
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        ios: {
          ccacheEnabled: true,
        },
      },
    ],
    [
      "expo-splash-screen",
      {
        image: SPLASH_IMAGE,
        resizeMode: "contain",
        backgroundColor: LIGHT_SPLASH_BACKGROUND,
        imageWidth: SPLASH_IMAGE_WIDTH,
        dark: {
          image: SPLASH_IMAGE,
          backgroundColor: DARK_SPLASH_BACKGROUND,
        },
      },
    ],
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
      "expo-speech-recognition",
      {
        microphonePermission:
          "Allow $(PRODUCT_NAME) to access your microphone so you can speak your order items.",
        speechRecognitionPermission:
          "Allow $(PRODUCT_NAME) to recognize your speech so you can add order items by voice.",
      },
    ],
    [
      "@stripe/stripe-react-native",
      {
        merchantIdentifier: "merchant.com.RunrStudios.BiteRunrRN",
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
      projectId: localConfig.extra?.eas?.projectId ?? "",
    },
  },
};

export default config;
