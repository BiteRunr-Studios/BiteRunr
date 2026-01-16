import Resend from "@auth/core/providers/resend";
import { generateOTPCode, sendOTPEmail } from "./emailHelpers";

export const ResendPasswordReset = Resend({
    id: "resend-password-reset",
    apiKey: process.env.AUTH_RESEND_KEY,
    async generateVerificationToken() {
        return generateOTPCode();
    },
    async sendVerificationRequest({ identifier: email, provider, token }) {
        if (!provider.apiKey) {
            throw new Error("Missing AUTH_RESEND_KEY environment variable");
        }
        await sendOTPEmail(provider.apiKey, email, token, {
            subject: "Reset your BiteRunr password",
            title: "Password Reset Request",
            bodyText:
                "You requested to reset your password. Use the code below to complete the process:",
        });
    },
});
