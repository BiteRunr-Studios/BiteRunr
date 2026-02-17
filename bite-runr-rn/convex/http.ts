import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Mount Better Auth routes using the Convex adapter
authComponent.registerRoutes(http, createAuth, {
    cors: {
        allowedOrigins: [
            "biterunr://",
            "exp://",
            ...(process.env.SITE_URL ? [process.env.SITE_URL] : []),
        ],
    },
});

// Mobile OAuth callback page - captures the auth code and redirects to the app
http.route({
    path: "/mobile-callback",
    method: "GET",
    handler: httpAction(async (_, request) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");

        // Build the app redirect URL with the code
        const appUrl = new URL("biterunr://oauth");
        if (code) {
            appUrl.searchParams.set("code", code);
        }
        if (error) {
            appUrl.searchParams.set("error", error);
        }

        // Return an HTML page that redirects to the app
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Signing in...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 20px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #ddd;
      border-top-color: #333;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    a {
      color: #007AFF;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Redirecting to BiteRunr...</p>
    <p><a href="${appUrl.toString()}">Tap here if not redirected</a></p>
  </div>
  <script>
    window.location.href = "${appUrl.toString()}";
  </script>
</body>
</html>`;

        return new Response(html, {
            status: 200,
            headers: { "Content-Type": "text/html" },
        });
    }),
});

// Stripe Connect onboarding redirects — Stripe requires https:// URLs,
// so these pages redirect the user back into the app via deep link.
http.route({
    path: "/stripe-onboarding-complete",
    method: "GET",
    handler: httpAction(async () => {
        return new Response(stripeRedirectHtml("biterunr://stripe-onboarding-complete", "Setup Complete"), {
            status: 200,
            headers: { "Content-Type": "text/html" },
        });
    }),
});

http.route({
    path: "/stripe-onboarding-refresh",
    method: "GET",
    handler: httpAction(async () => {
        return new Response(stripeRedirectHtml("biterunr://stripe-onboarding-refresh", "Redirecting..."), {
            status: 200,
            headers: { "Content-Type": "text/html" },
        });
    }),
});

function stripeRedirectHtml(deepLink: string, title: string) {
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}.container{text-align:center;padding:20px}.spinner{width:40px;height:40px;border:3px solid #ddd;border-top-color:#333;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 20px}@keyframes spin{to{transform:rotate(360deg)}}a{color:#007AFF;text-decoration:none}</style>
</head><body><div class="container"><div class="spinner"></div><p>Redirecting to BiteRunr...</p><p><a href="${deepLink}">Tap here if not redirected</a></p></div>
<script>window.location.href="${deepLink}";</script></body></html>`;
}

// Stripe Checkout payment redirects — same pattern as onboarding redirects.
// Stripe Checkout success_url/cancel_url need HTTPS, so we redirect via deep link.
http.route({
    path: "/stripe-payment-success",
    method: "GET",
    handler: httpAction(async (_, request) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get("orderId") ?? "";
        return new Response(
            stripeRedirectHtml(
                `biterunr://payment-success?orderId=${encodeURIComponent(orderId)}`,
                "Payment Successful",
            ),
            { status: 200, headers: { "Content-Type": "text/html" } },
        );
    }),
});

http.route({
    path: "/stripe-payment-cancel",
    method: "GET",
    handler: httpAction(async (_, request) => {
        const url = new URL(request.url);
        const orderId = url.searchParams.get("orderId") ?? "";
        return new Response(
            stripeRedirectHtml(
                `biterunr://payment-cancel?orderId=${encodeURIComponent(orderId)}`,
                "Payment Cancelled",
            ),
            { status: 200, headers: { "Content-Type": "text/html" } },
        );
    }),
});

// Stripe Connect webhook endpoint
http.route({
    path: "/stripe-connect/webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature)
            return new Response("Missing stripe-signature header", {
                status: 400,
            });

        const body = await request.text();
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error("STRIPE_WEBHOOK_SECRET not configured");
            return new Response("Webhook secret not configured", { status: 500 });
        }

        // Parse Stripe signature header: t=timestamp,v1=signature
        const parts = Object.fromEntries(
            signature.split(",").map((part) => {
                const [key, ...val] = part.split("=");
                return [key, val.join("=")];
            }),
        );
        const timestamp = parts["t"];
        const v1Signature = parts["v1"];

        if (!timestamp || !v1Signature) {
            return new Response("Invalid signature format", { status: 400 });
        }

        // Verify HMAC-SHA256: sign "timestamp.body" with webhook secret
        const key = await crypto.subtle.importKey(
            "raw",
            new TextEncoder().encode(webhookSecret),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign"],
        );
        const mac = await crypto.subtle.sign(
            "HMAC",
            key,
            new TextEncoder().encode(`${timestamp}.${body}`),
        );
        const expectedSignature = Array.from(new Uint8Array(mac))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        if (v1Signature !== expectedSignature) {
            console.error("Stripe webhook: invalid signature");
            return new Response("Invalid signature", { status: 400 });
        }

        // Reject events older than 5 minutes to prevent replay attacks
        const eventAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
        if (eventAge > 300) {
            return new Response("Event too old", { status: 400 });
        }

        try {
            const event = JSON.parse(body);

            switch (event.type) {
                case "account.updated": {
                    const account = event.data.object;
                    await ctx.runMutation(
                        internal.payments.updateConnectedAccountByStripeId,
                        {
                            stripeAccountId: account.id,
                            onboardingComplete: account.details_submitted ?? false,
                            payoutsEnabled: account.payouts_enabled ?? false,
                            chargesEnabled: account.charges_enabled ?? false,
                        },
                    );
                    break;
                }
                case "checkout.session.completed": {
                    const session = event.data.object;
                    await ctx.runMutation(
                        internal.payments.updateStripePaymentBySessionId,
                        {
                            stripeSessionId: session.id,
                            status: "completed",
                            stripePaymentIntentId:
                                typeof session.payment_intent === "string"
                                    ? session.payment_intent
                                    : session.payment_intent?.id,
                        },
                    );
                    break;
                }
                case "payment_intent.succeeded":
                    console.log("Payment succeeded:", event.data.object.id);
                    break;
                case "payment_intent.payment_failed":
                    console.log("Payment failed:", event.data.object.id);
                    break;
                case "transfer.created": {
                    const transfer = event.data.object;
                    const transferRunner = await ctx.runQuery(
                        internal.payments.getRunnerByStripeAccountId,
                        { stripeAccountId: transfer.destination },
                    );
                    if (transferRunner) {
                        await ctx.scheduler.runAfter(
                            0,
                            internal.pushNotifications.sendToUser,
                            {
                                userId: transferRunner.userId,
                                title: "Payment Received",
                                body: "Your payment has been transferred to your Stripe balance.",
                                data: { type: "transfer_created" },
                            },
                        );
                    }
                    break;
                }
                case "payout.paid": {
                    const payout = event.data.object;
                    const payoutRunner = await ctx.runQuery(
                        internal.payments.getRunnerByStripeAccountId,
                        { stripeAccountId: event.account },
                    );
                    if (payoutRunner) {
                        const amountFormatted = `$${(payout.amount / 100).toFixed(2)}`;
                        await ctx.scheduler.runAfter(
                            0,
                            internal.pushNotifications.sendToUser,
                            {
                                userId: payoutRunner.userId,
                                title: "Payout Sent",
                                body: `Your payout of ${amountFormatted} has been sent to your bank.`,
                                data: { type: "payout_paid" },
                            },
                        );
                    }
                    break;
                }
                case "payout.failed": {
                    const failedPayoutRunner = await ctx.runQuery(
                        internal.payments.getRunnerByStripeAccountId,
                        { stripeAccountId: event.account },
                    );
                    if (failedPayoutRunner) {
                        await ctx.scheduler.runAfter(
                            0,
                            internal.pushNotifications.sendToUser,
                            {
                                userId: failedPayoutRunner.userId,
                                title: "Payout Failed",
                                body: "Your payout failed — please check your bank details in Stripe.",
                                data: { type: "payout_failed" },
                            },
                        );
                    }
                    break;
                }
                default:
                    console.log("Unhandled Stripe event:", event.type);
            }

            return new Response("OK", { status: 200 });
        } catch (error) {
            console.error("Stripe webhook processing error:", error);
            return new Response("Internal error", { status: 500 });
        }
    }),
});

// Paysafe webhook connectivity check (GET for Test Connectivity button)
http.route({
    path: "/paysafe-webhook",
    method: "GET",
    handler: httpAction(async () => {
        return new Response("OK", { status: 200 });
    }),
});

// Paysafe webhook endpoint
http.route({
    path: "/paysafe-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        try {
            const body = await request.text();

            // Verify webhook signature
            const webhookSecret = process.env.PAYSAFE_WEBHOOK_SECRET;
            if (webhookSecret) {
                const signature = request.headers.get("Signature");
                if (!signature) {
                    console.error("Paysafe webhook: missing Signature header");
                    return new Response("Missing signature", { status: 401 });
                }

                const key = await crypto.subtle.importKey(
                    "raw",
                    new TextEncoder().encode(webhookSecret),
                    { name: "HMAC", hash: "SHA-256" },
                    false,
                    ["sign"],
                );
                const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
                const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));

                if (signature !== expected) {
                    console.error("Paysafe webhook: invalid signature");
                    return new Response("Invalid signature", { status: 401 });
                }
            } else {
                console.warn("PAYSAFE_WEBHOOK_SECRET not configured — skipping signature verification");
            }

            const payload = JSON.parse(body);

            // Extract eventType - could be at top level or nested
            const eventType = (
                payload.eventType ??
                payload.type ??
                payload.event
            ) as string | undefined;

            // Extract merchantRefNum - Paysafe nests data inside a "payload" key
            const merchantRefNum = (
                payload.payload?.merchantRefNum ??
                payload.merchantRefNum ??
                payload.paymentHandle?.merchantRefNum ??
                payload.payment?.merchantRefNum ??
                payload.data?.merchantRefNum
            ) as string | undefined;

            console.log("Paysafe webhook received:", { eventType, merchantRefNum });

            if (!eventType || !merchantRefNum) {
                console.error("Paysafe webhook: missing fields", {
                    eventType,
                    merchantRefNum,
                    keys: Object.keys(payload),
                });
                return new Response("Missing eventType or merchantRefNum", { status: 400 });
            }

            // Find the payment handle by merchant ref
            const handle = await ctx.runQuery(internal.paysafe.findPaymentHandleByMerchantRef, {
                merchantRefNum,
            });

            if (!handle) {
                console.error("Paysafe webhook: handle not found for", merchantRefNum);
                return new Response("Payment handle not found", { status: 404 });
            }

            // Process the webhook event
            await ctx.runMutation(internal.paysafe.processWebhook, {
                paymentHandleId: handle._id,
                eventType,
                paysafeResponse: JSON.stringify(payload),
            });

            // If the handle is now payable, trigger payment processing
            if (eventType === "PAYMENT_HANDLE_PAYABLE" && handle.paymentHandleId) {
                await ctx.scheduler.runAfter(0, internal.paysafe.processPayment, {
                    paymentHandleId: handle._id,
                    paymentHandleToken: handle.paymentHandleId,
                    merchantRefNum: handle.merchantRefNum,
                    amountInCents: handle.amountInCents,
                });
            }

            return new Response("OK", { status: 200 });
        } catch (error) {
            console.error("Paysafe webhook error:", error);
            return new Response("Internal error", { status: 500 });
        }
    }),
});

export default http;
