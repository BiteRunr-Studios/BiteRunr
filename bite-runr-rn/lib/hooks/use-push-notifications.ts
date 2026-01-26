import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/convex-auth-context";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export function usePushNotifications() {
    const { isLoggedIn, isReady } = useAuth();
    const registerToken = useMutation(api.pushNotifications.registerPushToken);
    const unregisterToken = useMutation(api.pushNotifications.unregisterPushToken);
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const hasRegistered = useRef(false);
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    useEffect(() => {
        if (!isReady || !isLoggedIn) return;
        if (hasRegistered.current) return;

        async function register() {
            try {
                const token = await registerForPushNotificationsAsync();
                console.log("Push token obtained:", token);
                if (token) {
                    setExpoPushToken(token);
                    await registerToken({ token });
                    console.log("Push token registered with Convex");
                    hasRegistered.current = true;
                }
            } catch (error) {
                console.error("Failed to register push token:", error);
            }
        }

        register();

        // Listen for incoming notifications while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.log("Notification received:", notification);
            }
        );

        // Listen for user tapping on notification
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const data = response.notification.request.content.data;
                handleNotificationTap(data);
            }
        );

        return () => {
            if (notificationListener.current) {
                notificationListener.current.remove();
            }
            if (responseListener.current) {
                responseListener.current.remove();
            }
        };
    }, [isReady, isLoggedIn, registerToken]);

    // Unregister token on logout
    useEffect(() => {
        if (isReady && !isLoggedIn && hasRegistered.current && expoPushToken) {
            unregisterToken({ token: expoPushToken }).catch(console.error);
            hasRegistered.current = false;
            setExpoPushToken(null);
        }
    }, [isReady, isLoggedIn, unregisterToken, expoPushToken]);

    return { expoPushToken };
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
        console.log("Push notifications require a physical device");
        return null;
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== "granted") {
        console.log("Push notification permission not granted");
        return null;
    }

    // Get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
        console.warn("No EAS project ID found. Run 'npx eas init' to configure.");
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
    });
    console.log("Expo push token data:", tokenData);

    // Android-specific channel setup
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#4A90D9",
        });
    }

    return tokenData.data;
}

function handleNotificationTap(data: Record<string, unknown>) {
    // Handle navigation based on notification type
    // Navigation can be added here based on your app's routing
    if (data.type === "friend_request") {
        // Could navigate to friends page
        console.log("Friend request notification tapped");
    } else if (data.type === "group_order" && data.orderId) {
        // Could navigate to order detail
        console.log("Group order notification tapped:", data.orderId);
    }
}
