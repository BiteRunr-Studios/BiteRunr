import { OpenAPIHono } from "@hono/zod-openapi";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";
import { pinoLogger } from "hono-pino";
import { cors } from "hono/cors";
import type { AppBindings } from "./types";
import env from "@/env";

export function createRouter() {
    return new OpenAPIHono<AppBindings>({
        strict: false,
        defaultHook,
    });
}

export default function createApp() {
    const app = createRouter();

    app.use(cors({
        origin: 'http://localhost:8081',
        credentials: true,
    }));
    app.use(serveEmojiFavicon("🍕"));
    app.use(
        pinoLogger({
            pino: { level: env.LOG_LEVEL || "info" },
            http: { referRequestIdKey: crypto.randomUUID() },
        })
    );

    app.notFound(notFound);
    app.onError(onError);

    return app;
}
