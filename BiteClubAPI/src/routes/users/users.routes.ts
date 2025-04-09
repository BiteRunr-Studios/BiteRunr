import { createRoute, z } from "@hono/zod-openapi";
import { jsonContent } from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";

const tags = ["Users"];

export const list = createRoute({
    path: "/users",
    method: "get",
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(
                z.object({
                    id: z.number(),
                    first_name: z.string().max(255),
                    last_name: z.string().max(255),
                    email: z.string().max(255).email(),
                })
            ),
            "List of users"
        ),
    },
});

export type ListRoute = typeof list;
