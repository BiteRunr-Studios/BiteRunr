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

export type GroupedItem = {
    item_id: string;
    item_name: string;
    total_quantity: number;
    requests: { comment: string | null; quantity: number }[];
};

export const GroupedItemSchema = z.object({
    item_id: z.string().uuid().nonempty("Item id is required"),
    item_name: z.string().nonempty("Item name is required"),
    total_quantity: z.number().min(0),
    requests: z.array(
        z.object({
            comment: z.string().nonempty("Comment is required"),
            quantity: z.number().min(1),
        })
    ),
});
