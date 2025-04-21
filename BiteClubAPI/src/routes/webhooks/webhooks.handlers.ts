import type { CreateRoute } from "./webhooks.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import db from "@/db";
import { subscribers } from "@/index";

export const orderItemsHook: AppRouteHandler<CreateRoute> = async (c) => {
    // Not needed
    const reqData = c.req.valid("json");

    const orderId = "c4d3803d-7f6c-4034-8ee7-d7c84b3af364";

    const items = await db.query.orderItems.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, orderId);
        },
    });

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
