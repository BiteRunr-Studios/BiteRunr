"use node";

import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { convexAdapter } from "@convex-dev/better-auth";
import { Resend } from "resend";
import authComponent from "@convex-dev/better-auth/convex.config";

const resend = new Resend(process.env.AUTH_RESEND_KEY);

export const auth = betterAuth({
    database: convexAdapter,
    trustedOrigins: [
        "biterunr://",
        "exp://",
        process.env.SITE_URL ?? "",
    ],
    emailAndPassword: {
        enabled: false, // Disable traditional email/password, use emailOTP instead
    },
    plugins: [
        emailOTP({
            async sendVerificationOTP({ email, otp, type }) {
                const subjectMap = {
                    "sign-in": "Sign in to BiteRunr",
                    "email-verification": "Verify your BiteRunr account",
                    "forget-password": "Reset your BiteRunr password",
                };
                const titleMap = {
                    "sign-in": "Sign In Code",
                    "email-verification": "Welcome to BiteRunr!",
                    "forget-password": "Password Reset Request",
                };
                const bodyMap = {
                    "sign-in": "Use this code to sign in:",
                    "email-verification": "Your verification code is:",
                    "forget-password": "You requested to reset your password. Use the code below:",
                };

                const subject = subjectMap[type] ?? "Your BiteRunr verification code";
                const title = titleMap[type] ?? "Verification Code";
                const bodyText = bodyMap[type] ?? "Your verification code is:";

                const { error } = await resend.emails.send({
                    from: "BiteRunr <onboarding@omniquark.me>",
                    to: [email],
                    subject,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h1 style="color: #333;">${title}</h1>
                            <p style="font-size: 16px; color: #666;">
                                ${bodyText}
                            </p>
                            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">
                                    ${otp}
                                </span>
                            </div>
                            <p style="font-size: 14px; color: #888;">
                                This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
                            </p>
                        </div>
                    `,
                    text: `${subject}: ${otp}. This code expires in 10 minutes.`,
                });

                if (error) {
                    console.error(`Failed to send OTP email:`, error);
                    throw new Error("Could not send verification email");
                }
            },
            otpLength: 6,
            expiresIn: 600, // 10 minutes
        }),
    ],
    user: {
        additionalFields: {
            firstName: {
                type: "string",
                required: true,
            },
            lastName: {
                type: "string",
                required: true,
            },
            avatarUrl: {
                type: "string",
                required: false,
            },
            avatarStorageId: {
                type: "string",
                required: false,
            },
        },
    },
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["google", "github"],
        },
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID ?? "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        },
    },
});

// Export auth component for use in other Convex functions
export { authComponent };
