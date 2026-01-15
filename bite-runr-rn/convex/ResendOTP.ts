import Resend from "@auth/core/providers/resend";
import { Resend as ResendAPI } from "resend";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";

// Create a random reader using Web Crypto API
const random: RandomReader = {
    read(bytes: Uint8Array): void {
        crypto.getRandomValues(bytes);
    },
};

export const ResendOTP = Resend({
    id: "resend-otp",
    apiKey: process.env.AUTH_RESEND_KEY,
    async generateVerificationToken() {
        // Generate a 6-digit OTP code
        return generateRandomString(random, "0123456789", 6);
    },
    async sendVerificationRequest({ identifier: email, provider, token }) {
        const resend = new ResendAPI(provider.apiKey);
        const { error } = await resend.emails.send({
            from: "BiteRunr <onboarding@omniquark.me>",
            to: [email],
            subject: "Verify your BiteRunr account",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333;">Welcome to BiteRunr!</h1>
                    <p style="font-size: 16px; color: #666;">
                        Your verification code is:
                    </p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">
                            ${token}
                        </span>
                    </div>
                    <p style="font-size: 14px; color: #888;">
                        This code expires in 15 minutes. If you didn't request this, you can safely ignore this email.
                    </p>
                </div>
            `,
            text: `Your BiteRunr verification code is: ${token}. This code expires in 15 minutes.`,
        });

        if (error) {
            console.error("Failed to send verification email:", error);
            throw new Error("Could not send verification email");
        }
    },
});
