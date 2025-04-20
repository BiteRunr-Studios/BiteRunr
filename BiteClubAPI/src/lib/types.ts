import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import { PinoLogger } from "hono-pino";

export interface AppBindings {
    Variables: {
        logger: PinoLogger;
        userId: string;
    };
}

export type AppOpenAPI = OpenAPIHono<AppBindings>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<
    R,
    AppBindings
>;

export type MessageSource = "client" | "server" | "webhook";
export type OperationType = "create" | "update" | "delete";

export type WSMessage<T = any> = {
    type: OperationType;
    payload: T;
    source: MessageSource;
};
