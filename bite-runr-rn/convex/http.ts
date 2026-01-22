import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Mount Better Auth routes using the Convex adapter
authComponent.registerRoutes(http, createAuth, {
    cors: {
        allowedOrigins: [
            "biterunr://",
            "exp://",
            process.env.SITE_URL ?? "",
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

export default http;
