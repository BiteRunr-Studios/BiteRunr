import type { CreateRoute } from "./webhooks.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import type { MessageSource, WSMessage } from "@/lib/types";
import { broadcast } from "@/index";
import db from "@/db";

export const orderItemsHook: AppRouteHandler<CreateRoute> = async (c) => {
    // Not needed
    const reqData = c.req.valid("json");

    const items = await db.query.orderItems.findMany();

    const msg: WSMessage = {
        type: "update",
        payload: items,
        source: "webhook",
    };
    broadcast(msg);

    return c.json({ message: "OK" }, HttpStatusCodes.OK);
};
