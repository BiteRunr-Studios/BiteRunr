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

// Stripe webhook handler
http.route({
    path: "/stripe-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const body = await request.text();
        const signature = request.headers.get("stripe-signature");

        if (!signature) {
            return new Response("Missing stripe-signature header", { status: 400 });
        }

        // Verify webhook signature
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const Stripe = require("stripe");
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

        let event;
        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                process.env.STRIPE_WEBHOOK_SECRET!,
            );
        } catch (err: any) {
            console.error("Webhook signature verification failed:", err.message);
            return new Response(`Webhook Error: ${err.message}`, { status: 400 });
        }

        switch (event.type) {
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                const payment = await ctx.runQuery(
                    internal.stripe.getPaymentByIntentId,
                    { paymentIntentId: paymentIntent.id },
                );
                if (payment) {
                    await ctx.runMutation(internal.stripe.updatePaymentStatus, {
                        paymentId: payment._id,
                        status: "succeeded",
                    });
                    await ctx.runMutation(internal.stripe.updateSettlementStatus, {
                        orderUserId: payment.orderUserId,
                        status: "paid",
                    });
                    // Send push notification to runner
                    const payer = await ctx.runQuery(internal.stripe.getUserData, {
                        userId: payment.payerUserId,
                    });
                    const payerName = payer
                        ? `${payer.firstName} ${payer.lastName}`.trim()
                        : "Someone";
                    const amountStr = (Number(payment.amountInCents) / 100).toFixed(2);
                    await ctx.runMutation(internal.pushNotifications.sendToUser, {
                        userId: payment.recipientUserId,
                        title: "Payment Received!",
                        body: `${payerName} paid you $${amountStr}`,
                        data: { type: "payment_received", orderId: payment.orderId },
                    });
                }
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object;
                const payment = await ctx.runQuery(
                    internal.stripe.getPaymentByIntentId,
                    { paymentIntentId: paymentIntent.id },
                );
                if (payment) {
                    await ctx.runMutation(internal.stripe.updatePaymentStatus, {
                        paymentId: payment._id,
                        status: "failed",
                        failureMessage:
                            paymentIntent.last_payment_error?.message ??
                            "Payment failed",
                    });
                    await ctx.runMutation(internal.stripe.updateSettlementStatus, {
                        orderUserId: payment.orderUserId,
                        status: "failed",
                    });
                }
                break;
            }

            case "account.updated": {
                const account = event.data.object;
                if (account.charges_enabled && account.details_submitted) {
                    const user = await ctx.runQuery(
                        internal.stripe.getUserByStripeAccountId,
                        { accountId: account.id },
                    );
                    if (user) {
                        await ctx.runMutation(internal.stripe.markOnboarded, {
                            userId: user._id,
                        });
                    }
                }
                break;
            }
        }

        return new Response("ok", { status: 200 });
    }),
});

// Stripe Connect return page (after onboarding completes)
http.route({
    path: "/stripe-connect-return",
    method: "GET",
    handler: httpAction(async () => {
        const appUrl = "biterunr://stripe-connect-return?status=complete";
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stripe Setup Complete</title>
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
    .container { text-align: center; padding: 20px; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid #ddd; border-top-color: #333;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    a { color: #007AFF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Returning to BiteRunr...</p>
    <p><a href="${appUrl}">Tap here if not redirected</a></p>
  </div>
  <script>window.location.href = "${appUrl}";</script>
</body>
</html>`;
        return new Response(html, {
            status: 200,
            headers: { "Content-Type": "text/html" },
        });
    }),
});

// Stripe Connect refresh page (onboarding needs to be retried)
http.route({
    path: "/stripe-connect-refresh",
    method: "GET",
    handler: httpAction(async () => {
        const appUrl = "biterunr://stripe-connect-return?status=refresh";
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Stripe Setup</title>
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
    .container { text-align: center; padding: 20px; }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid #ddd; border-top-color: #333;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    a { color: #007AFF; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Returning to BiteRunr...</p>
    <p><a href="${appUrl}">Tap here if not redirected</a></p>
  </div>
  <script>window.location.href = "${appUrl}";</script>
</body>
</html>`;
        return new Response(html, {
            status: 200,
            headers: { "Content-Type": "text/html" },
        });
    }),
});

export default http;
