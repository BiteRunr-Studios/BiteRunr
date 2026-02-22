import React, { useRef, useState, useCallback } from "react";
import {
    View,
    Text,
    Modal,
    Pressable,
    ActivityIndicator,
    Platform,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";
import Icon from "@/components/common/icon";
import { useColorScheme } from "@/lib/use-color-scheme";
import { NAV_THEME } from "@/lib/constants";

type StripeOnboardingWebViewProps = {
    visible: boolean;
    url: string;
    title?: string;
    onComplete?: () => void;
    onRefresh?: () => void;
    onDismiss: () => void;
};

export function StripeOnboardingWebView({
    visible,
    url,
    title = "Payment Setup",
    onComplete,
    onRefresh,
    onDismiss,
}: StripeOnboardingWebViewProps) {
    const { colorScheme } = useColorScheme();
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const isRedirectUrl = useCallback((navUrl: string) => {
        if (navUrl.includes("stripe-onboarding-complete")) return "complete";
        if (navUrl.includes("stripe-onboarding-refresh")) return "refresh";
        return null;
    }, []);

    // iOS: intercept before navigation starts
    const handleShouldStartLoad = useCallback(
        (request: ShouldStartLoadRequest) => {
            const redirect = isRedirectUrl(request.url);
            if (redirect === "complete" && onComplete) {
                onComplete();
                return false;
            }
            if (redirect === "refresh" && onRefresh) {
                onRefresh();
                return false;
            }
            return true;
        },
        [isRedirectUrl, onComplete, onRefresh],
    );

    // Android fallback: onShouldStartLoadWithRequest may not fire consistently
    const handleNavigationStateChange = useCallback(
        (navState: WebViewNavigation) => {
            if (Platform.OS === "ios") return;
            const redirect = isRedirectUrl(navState.url);
            if (redirect === "complete" && onComplete) {
                onComplete();
            } else if (redirect === "refresh" && onRefresh) {
                onRefresh();
            }
        },
        [isRedirectUrl, onComplete, onRefresh],
    );

    const handleRetry = useCallback(() => {
        setHasError(false);
        setIsLoading(true);
        webViewRef.current?.reload();
    }, []);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onDismiss}>
            <SafeAreaProvider>
                <SafeAreaView
                    className="flex-1 bg-background"
                    edges={["top", "bottom"]}>
                    {/* Header */}
                    <View className="flex-row items-center px-4 py-3 border-b border-border">
                        <Pressable
                            onPress={onDismiss}
                            className="p-2 -ml-2 rounded-full active:opacity-70">
                            <Icon
                                name="X"
                                size={24}
                                color={NAV_THEME[colorScheme].text}
                            />
                        </Pressable>
                        <Text className="flex-1 ml-2 text-lg font-semibold text-foreground">
                            {title}
                        </Text>
                    </View>

                    {/* WebView */}
                    {hasError ? (
                        <View className="flex-1 justify-center items-center px-6">
                            <Icon
                                name="CircleAlert"
                                size={48}
                                color={NAV_THEME[colorScheme].notification}
                            />
                            <Text className="text-foreground text-base font-medium mt-4 text-center">
                                Failed to load
                            </Text>
                            <Text className="text-muted-foreground text-sm mt-1 text-center mb-6">
                                Check your internet connection and try again.
                            </Text>
                            <Pressable
                                onPress={handleRetry}
                                className="flex-row items-center gap-2 px-6 py-3 rounded-xl bg-primary active:opacity-80">
                                <Icon
                                    name="RefreshCw"
                                    size={18}
                                    color="white"
                                />
                                <Text className="text-white font-semibold">
                                    Retry
                                </Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View className="flex-1">
                            <WebView
                                ref={webViewRef}
                                source={{ uri: url }}
                                onShouldStartLoadWithRequest={
                                    handleShouldStartLoad
                                }
                                onNavigationStateChange={
                                    handleNavigationStateChange
                                }
                                onLoadStart={() => setIsLoading(true)}
                                onLoadEnd={() => setIsLoading(false)}
                                onError={() => {
                                    setHasError(true);
                                    setIsLoading(false);
                                }}
                                javaScriptEnabled
                                domStorageEnabled
                                startInLoadingState={false}
                                sharedCookiesEnabled
                            />
                            {isLoading && (
                                <View className="absolute inset-0 justify-center items-center bg-background">
                                    <ActivityIndicator
                                        size="large"
                                        color={
                                            NAV_THEME[colorScheme].primary
                                        }
                                    />
                                    <Text className="text-muted-foreground mt-3">
                                        Loading...
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </SafeAreaView>
            </SafeAreaProvider>
        </Modal>
    );
}
