import { createRoute } from "@hono/zod-openapi";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import { authMiddleware } from "@/middlewares/clerk-auth";

const tags = ["Webhooks"];

export const orderItemsHook = createRoute({
    path: "/order-items-hook",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        body: jsonContentRequired(z.unknown(), ""),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(z.unknown(), ""),
    },
});

export type CreateRoute = typeof orderItemsHook;
