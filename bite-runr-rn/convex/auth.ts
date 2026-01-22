import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { Resend } from "resend";
import { components } from "./_generated/api";
import authConfig from "./auth.config";

const resend = new Resend(process.env.AUTH_RESEND_KEY);

// Get base URL for OAuth callbacks
const siteUrl = process.env.SITE_URL ?? "";

// Create the Better Auth client for Convex
export const authComponent = createClient(components.betterAuth);

// Create the Better Auth instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createAuth = (ctx: any) => {
    return betterAuth({
        database: authComponent.adapter(ctx),
        baseURL: siteUrl,
        trustedOrigins: [
            "biterunr://",
            "biterunr://*",
            // Development Expo URLs
            ...(process.env.NODE_ENV === "development"
                ? ["exp://", "exp://**"]
                : []),
            siteUrl,
        ],
        emailAndPassword: {
            enabled: true,
        },
        plugins: [
            convex({ authConfig }),
            expo(),
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
                        "forget-password":
                            "You requested to reset your password. Use the code below:",
                    };

                    const subject =
                        subjectMap[type] ?? "Your BiteRunr verification code";
                    const title = titleMap[type] ?? "Verification Code";
                    const bodyText =
                        bodyMap[type] ?? "Your verification code is:";

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
        account: {
            accountLinking: {
                enabled: true,
                trustedProviders: ["google", "github"],
            },
        },
        socialProviders: {
            github: {
                clientId: process.env.AUTH_GITHUB_ID ?? "",
                clientSecret: process.env.AUTH_GITHUB_SECRET ?? "",
                redirectURI: `${siteUrl}/api/auth/callback/github`,
            },
            google: {
                clientId: process.env.AUTH_GOOGLE_ID ?? "",
                clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
                redirectURI: `${siteUrl}/api/auth/callback/google`,
            },
        },
    });
};
