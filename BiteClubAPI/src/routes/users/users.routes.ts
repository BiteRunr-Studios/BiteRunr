import { createRoute } from "@hono/zod-openapi";
import { jsonContent } from "stoker/openapi/helpers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { z } from "zod";
import { selectUserSchema } from "@/db/schema/user.js";

const tags = ["Users"];

export const list = createRoute({
    path: "/users",
    method: "get",
    tags,
    responses: {
        [HttpStatusCodes.OK]: jsonContent(
            z.array(selectUserSchema),
            "List of users"
        ),
    },
});

export type ListRoute = typeof list;
