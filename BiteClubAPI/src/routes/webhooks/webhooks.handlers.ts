import type { CreateRoute } from "./webhooks.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";

export const orderItemsHook: AppRouteHandler<CreateRoute> = async (c) => {
    const reqData = c.req.valid("json");

    return c.json(reqData, HttpStatusCodes.OK);
};
