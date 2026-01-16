import Resend from "@auth/core/providers/resend";
import { generateOTPCode, sendOTPEmail } from "./emailHelpers";

export const ResendOTP = Resend({
    id: "resend-otp",
    apiKey: process.env.AUTH_RESEND_KEY,
    async generateVerificationToken() {
        return generateOTPCode();
    },
    async sendVerificationRequest({ identifier: email, provider, token }) {
        if (!provider.apiKey) {
            throw new Error("Missing AUTH_RESEND_KEY environment variable");
        }
        await sendOTPEmail(provider.apiKey, email, token, {
            subject: "Verify your BiteRunr account",
            title: "Welcome to BiteRunr!",
            bodyText: "Your verification code is:",
        });
    },
});
