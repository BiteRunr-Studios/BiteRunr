import { createRouter } from "@/lib/create-app.js";
import { createRoute, z } from "@hono/zod-openapi";
import { jsonContent } from "stoker/openapi/helpers";

const router = createRouter().openapi(
    createRoute({
        method: "get",
        path: "/",
        responses: {
            200: jsonContent(
                z.object({
                    message: z.string(),
                }),
                "BiteClub API Index"
            ),
        },
    }),
    (c) => {
        return c.json({
            message: "BiteClub API",
        });
    }
);

export default router;
