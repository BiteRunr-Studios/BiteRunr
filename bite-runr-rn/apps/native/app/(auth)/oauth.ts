import { makeRedirectUri } from "expo-auth-session";

export const redirectTo = makeRedirectUri({
    scheme: "biterunr",
    path: "auth/callback",
});
