import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

// Get the Convex site URL from environment
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error(
    "EXPO_PUBLIC_CONVEX_URL environment variable is required. " +
      "Add it to your .env file (e.g., EXPO_PUBLIC_CONVEX_URL=https://your-app.convex.cloud)",
  );
}
const siteUrl = convexUrl.replace(".cloud", ".site");

export const authClient = createAuthClient({
  baseURL: `${siteUrl}/api/auth`,
  plugins: [
    emailOTPClient(),
    convexClient(),
    expoClient({
      scheme: "biterunr",
      storagePrefix: "biterunr-auth",
      storage: SecureStore,
    }),
  ],
});

// Export types for use in components
export type Session = typeof authClient.$Infer.Session;
export type User = typeof authClient.$Infer.Session.user;
