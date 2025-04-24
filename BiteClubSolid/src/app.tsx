import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { MetaProvider, Link } from "@solidjs/meta";
import "./app.css";

export default function App() {
    return (
        <MetaProvider>
            <Router
                root={(props) => (
                    <>
                        <Suspense>{props.children}</Suspense>
                    </>
                )}>
                <Link rel="apple-touch-icon" href="/logo.png" sizes="192x192" />
                <Link rel="apple-touch-icon" href="/logo.png" sizes="512x512" />
                <Link rel="manifest" href="/manifest.webmanifest" />

                <FileRoutes />
            </Router>
        </MetaProvider>
    );
}
