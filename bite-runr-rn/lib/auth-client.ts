import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

// Get the Convex site URL from environment
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL ?? "";
const siteUrl = convexUrl.replace(".cloud", ".site");

export const authClient = createAuthClient({
    baseURL: `${siteUrl}/api/auth`,
    plugins: [
        emailOTPClient(),
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
