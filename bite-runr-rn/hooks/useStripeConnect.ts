import { useState, useCallback } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as WebBrowser from "expo-web-browser";

export function useStripeConnect() {
    const connectStatus = useQuery(api.stripe.getConnectStatus);
    const createConnectAccountAction = useAction(api.stripe.createConnectAccount);
    const checkStatusAction = useAction(api.stripe.checkConnectAccountStatus);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startOnboarding = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await createConnectAccountAction();
            if (!result?.url) {
                throw new Error("Failed to get onboarding URL");
            }

            // Open Stripe onboarding in browser
            await WebBrowser.openBrowserAsync(result.url);

            // After returning from browser, check the status
            await checkStatusAction();
        } catch (err: any) {
            setError(err?.message ?? "Failed to start onboarding");
        } finally {
            setIsLoading(false);
        }
    }, [createConnectAccountAction, checkStatusAction]);

    return {
        isOnboarded: connectStatus?.isOnboarded ?? false,
        hasAccount: connectStatus?.hasAccount ?? false,
        isLoading: isLoading || connectStatus === undefined,
        error,
        startOnboarding,
    };
}
