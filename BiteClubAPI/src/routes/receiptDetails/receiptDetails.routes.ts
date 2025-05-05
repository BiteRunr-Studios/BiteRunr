import { createRoute } from "@hono/zod-openapi";
import { jsonContent } from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z, ZodSchema } from "zod";
import { authMiddleware } from "@/middlewares/clerk-auth";
import { receiptDetails } from "@/db/schema/receiptDetails";

const tags = ["Receipt Details"];

const multipartContentRequired = <T extends ZodSchema>(
    schema: T,
    description: string
) => ({
    required: true,
    content: {
        "multipart/form-data": {
            schema,
        },
    },
    description,
});

export const scanReceipt = createRoute({
    path: "/scan-receipt",
    method: "post",
    tags,
    security: [{ Bearer: [] }],
    middleware: [authMiddleware] as const,
    request: {
        body: multipartContentRequired(
            z.object({ file: z.any() }),
            "Receipt Image"
        ),
    },
    responses: {
        [HttpStatusCodes.OK]: jsonContent(receiptDetails, "Receipt Details"),
        [HttpStatusCodes.BAD_REQUEST]: jsonContent(
            z.object({ message: z.string() }),
            "No upload error"
        ),
    },
});

export type CreateRoute = typeof scanReceipt;
