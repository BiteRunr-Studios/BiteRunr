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
            const payload = await request.json();
            console.log("Paysafe webhook received:", JSON.stringify(payload));

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
