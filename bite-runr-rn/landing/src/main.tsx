import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App.tsx";

const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();

const app = (
  <StrictMode>
    <App waitlistEnabled={Boolean(convexUrl)} />
  </StrictMode>
);

if (!convexUrl) {
  console.warn(
    "VITE_CONVEX_URL is not set. Rendering landing page without waitlist submission.",
  );
}

createRoot(document.getElementById("root")!).render(
  convexUrl ? (
    <ConvexProvider client={new ConvexReactClient(convexUrl)}>{app}</ConvexProvider>
  ) : (
    app
  ),
);
