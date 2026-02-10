import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { useStripe } from "@stripe/stripe-react-native";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type PaymentState = "idle" | "creating" | "presenting" | "succeeded" | "failed";

export function useStripePayment() {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const createPaymentIntentAction = useAction(api.stripe.createPaymentIntent);

    const [state, setState] = useState<PaymentState>("idle");
    const [error, setError] = useState<string | null>(null);

    const pay = useCallback(
        async (orderUserId: Id<"orderUsers">) => {
            setState("creating");
            setError(null);

            try {
                // Create PaymentIntent on backend
                const result = await createPaymentIntentAction({ orderUserId });

                if (!result?.clientSecret) {
                    throw new Error("Failed to create payment");
                }

                // Initialize Payment Sheet
                const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: result.clientSecret,
                    merchantDisplayName: "BiteRunr",
                    allowsDelayedPaymentMethods: false,
                });

                if (initError) {
                    throw new Error(initError.message);
                }

                // Present Payment Sheet
                setState("presenting");
                const { error: presentError } = await presentPaymentSheet();

                if (presentError) {
                    if (presentError.code === "Canceled") {
                        // User cancelled -- reset to idle
                        setState("idle");
                        return false;
                    }
                    throw new Error(presentError.message);
                }

                setState("succeeded");
                return true;
            } catch (err: any) {
                setState("failed");
                setError(err?.message ?? "Payment failed");
                return false;
            }
        },
        [createPaymentIntentAction, initPaymentSheet, presentPaymentSheet],
    );

    const reset = useCallback(() => {
        setState("idle");
        setError(null);
    }, []);

    return {
        pay,
        reset,
        state,
        error,
        isProcessing: state === "creating" || state === "presenting",
    };
}
