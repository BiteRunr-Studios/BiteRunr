import type { CreateRoute } from "./webhooks.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import db from "@/db";
import { subscribers } from "@/index";
import { orderItems, orderLocations } from "@/db/schema";
import { eq } from "drizzle-orm";

export const orderItemsHook: AppRouteHandler<CreateRoute> = async (c) => {
    // Not needed
    const reqData = c.req.valid("json");

    const orderId = "c4d3803d-7f6c-4034-8ee7-d7c84b3af364";

    const items = await db
        .select({
            id: orderItems.id,
            order_location_id: orderItems.order_location_id,
            user_id: orderItems.user_id,
            name: orderItems.name,
            comments: orderItems.comments,
            quantity: orderItems.quantity,
            created_at: orderItems.created_at,
            updated_at: orderItems.updated_at,
        })
        .from(orderItems)
        .innerJoin(
            orderLocations,
            eq(orderItems.order_location_id, orderLocations.id)
        )
        .where(eq(orderLocations.order_id, orderId));

    const streams = subscribers.get(orderId);
    if (streams) {
        for (const stream of streams) {
            await stream.writeSSE({
                data: JSON.stringify(items),
                event: "order-items-update",
            });
        }
    }

    return c.json({ message: "OK" }, HttpStatusCodes.OK);
};
