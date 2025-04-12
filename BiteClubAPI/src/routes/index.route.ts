import { createRouter } from "@/lib/create-app";
import { createRoute, z } from "@hono/zod-openapi";
import { jsonContent } from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";

const tags = ["Index"];

const router = createRouter().openapi(
    createRoute({
        method: "get",
        path: "/",
        tags,
        responses: {
            [HttpStatusCodes.OK]: jsonContent(
                z.object({
                    message: z.string(),
                }),
                "BiteClub API Index"
            ),
        },
    }),
    (c) => {
        return c.json(
            {
                message: "BiteRunr API",
            },
            HttpStatusCodes.OK
        );
    }
);

export default router;
