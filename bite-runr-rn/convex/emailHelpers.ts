import { Resend as ResendAPI } from "resend";
import { generateRandomString, type RandomReader } from "@oslojs/crypto/random";

// Create a random reader using Web Crypto API
const random: RandomReader = {
    read(bytes: Uint8Array): void {
        crypto.getRandomValues(bytes);
    },
};

/**
 * Generate a 6-digit OTP code
 */
export function generateOTPCode(): string {
    return generateRandomString(random, "0123456789", 6);
}

/**
 * Shared email sending configuration
 */
export const EMAIL_FROM = "BiteRunr <onboarding@omniquark.me>";

type EmailContent = {
    subject: string;
    title: string;
    bodyText: string;
    footerText?: string;
};

/**
 * Send an OTP email with consistent styling
 */
export async function sendOTPEmail(
    apiKey: string,
    email: string,
    token: string,
    content: EmailContent
): Promise<void> {
    const resend = new ResendAPI(apiKey);
    const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: [email],
        subject: content.subject,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #333;">${content.title}</h1>
                <p style="font-size: 16px; color: #666;">
                    ${content.bodyText}
                </p>
                <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">
                        ${token}
                    </span>
                </div>
                <p style="font-size: 14px; color: #888;">
                    ${content.footerText ?? "This code expires in 15 minutes. If you didn't request this, you can safely ignore this email."}
                </p>
            </div>
        `,
        text: `${content.subject}: ${token}. This code expires in 15 minutes.`,
    });

    if (error) {
        console.error(`Failed to send email (${content.subject}):`, error);
        throw new Error(`Could not send email`);
    }
}
