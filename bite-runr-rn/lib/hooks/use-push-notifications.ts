import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useMutation, useQuery } from "convex/react";
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
    const hasToken = useQuery(
        api.pushNotifications.hasToken,
        isReady && isLoggedIn ? {} : "skip"
    );

    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const hasCheckedPermission = useRef(false);
    const isRegistering = useRef(false);
    const notificationListener = useRef<Notifications.EventSubscription | null>(null);
    const responseListener = useRef<Notifications.EventSubscription | null>(null);

    // Check if we should show the permission modal
    useEffect(() => {
        if (!isReady || !isLoggedIn) return;
        if (hasToken === undefined) return; // Still loading
        if (hasCheckedPermission.current) return;

        // Only show modal if user doesn't have a token registered
        if (hasToken === false) {
            setShowPermissionModal(true);
        }
        hasCheckedPermission.current = true;
    }, [isReady, isLoggedIn, hasToken]);

    // Sync local token state for returning users who already have a token registered
    useEffect(() => {
        if (!isReady || !isLoggedIn || hasToken !== true) return;
        if (expoPushToken) return; // Already synced

        (async () => {
            const token = await getExistingPushToken();
            if (token) {
                setExpoPushToken(token);
            }
        })();
    }, [isReady, isLoggedIn, hasToken, expoPushToken]);

    // Handle user allowing notifications
    const handleAllowNotifications = useCallback(async () => {
        if (isRegistering.current) return;
        isRegistering.current = true;
        setShowPermissionModal(false);

        try {
            const token = await registerForPushNotificationsAsync();
            if (token) {
                setExpoPushToken(token);
                await registerToken({ token });
            }
        } catch (error) {
            console.error("Failed to register push token:", error);
            isRegistering.current = false;
        }
    }, [registerToken]);

    // Handle user denying notifications
    const handleDenyNotifications = useCallback(() => {
        setShowPermissionModal(false);
    }, []);

    // Set up notification listeners when we have a token
    useEffect(() => {
        if (!isReady || !isLoggedIn || !hasToken) return;

        // Listen for incoming notifications while app is foregrounded
        notificationListener.current = Notifications.addNotificationReceivedListener(
            (_notification) => {
                // Handle foreground notification if needed
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
    }, [isReady, isLoggedIn, hasToken]);

    // Unregister token on logout
    useEffect(() => {
        if (isReady && !isLoggedIn && expoPushToken) {
            unregisterToken({}).catch(console.error);
            setExpoPushToken(null);
            hasCheckedPermission.current = false;
            isRegistering.current = false;
        }
    }, [isReady, isLoggedIn, unregisterToken, expoPushToken]);

    return {
        expoPushToken,
        showPermissionModal,
        handleAllowNotifications,
        handleDenyNotifications,
    };
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
    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
    });

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

// Get existing push token without requesting permissions (for returning users)
async function getExistingPushToken(): Promise<string | null> {
    if (!Device.isDevice) return null;

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return null;

    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: projectId || undefined,
        });
        return tokenData.data;
    } catch {
        return null;
    }
}

function handleNotificationTap(_data: Record<string, unknown>) {
    // Handle navigation based on notification type
    // Navigation can be added here based on your app's routing
    // Example:
    // if (data.type === "friend_request") {
    //     router.push("/(protected)/account/friends");
    // } else if (data.type === "group_order" && data.orderId) {
    //     router.push(`/(protected)/order/${data.orderId}`);
    // }
}
