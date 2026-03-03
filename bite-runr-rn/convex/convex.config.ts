import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import pushNotifications from "@convex-dev/expo-push-notifications/convex.config";

const app = defineApp();
app.use(betterAuth);
app.use(pushNotifications);
export default app;
