import type { OpenAPIHono, RouteConfig, RouteHandler } from "@hono/zod-openapi";
import { PinoLogger } from "hono-pino";
import { z } from "zod";

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

export const ScanReceiptResponse = z.object({
    items: z.array(
        z.object({
            name: z.string().nonempty(),
            unit_price: z.number(),
            quantity: z.number().min(1),
        })
    ),
    subtotal: z.number().min(0),
    tax: z.number().min(0),
    total: z.number().min(0),
});
