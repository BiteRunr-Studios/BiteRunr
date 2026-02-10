import { useState, useCallback, useRef } from "react";
import { useAction, useMutation } from "convex/react";
import { useStripe } from "@stripe/stripe-react-native";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

type PaymentState = "idle" | "creating" | "presenting" | "succeeded" | "failed";

export function useStripePayment() {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const createPaymentIntentAction = useAction(api.stripe.createPaymentIntent);
    const cancelPayment = useMutation(api.stripe.cancelPendingPayment);
    const activeOrderUserId = useRef<Id<"orderUsers"> | null>(null);

    const [state, setState] = useState<PaymentState>("idle");
    const [error, setError] = useState<string | null>(null);

    const resetPayment = useCallback(
        async (orderUserId: Id<"orderUsers">) => {
            try {
                await cancelPayment({ orderUserId });
            } catch {
                // Best effort
            }
        },
        [cancelPayment],
    );

    const pay = useCallback(
        async (orderUserId: Id<"orderUsers">) => {
            setState("creating");
            setError(null);
            activeOrderUserId.current = orderUserId;

            try {
                const result = await createPaymentIntentAction({ orderUserId });

                if (!result?.clientSecret) {
                    throw new Error("Failed to create payment");
                }

                const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: result.clientSecret,
                    merchantDisplayName: "BiteRunr",
                    allowsDelayedPaymentMethods: false,
                });

                if (initError) {
                    throw new Error(initError.message);
                }

                setState("presenting");
                const { error: presentError } = await presentPaymentSheet();

                if (presentError) {
                    // User dismissed or payment failed -- reset backend state
                    await resetPayment(orderUserId);
                    setState("idle");
                    return false;
                }

                // Success -- webhook will update the status
                activeOrderUserId.current = null;
                setState("succeeded");
                return true;
            } catch (err: any) {
                await resetPayment(orderUserId);
                setState("failed");
                setError(err?.message ?? "Payment failed");
                return false;
            }
        },
        [createPaymentIntentAction, initPaymentSheet, presentPaymentSheet, resetPayment],
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
