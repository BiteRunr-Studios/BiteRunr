import { createRouter } from "@/lib/create-app";
import * as handlers from "./friends.handlers";
import * as routes from "./friends.routes";

const router = createRouter()
    .openapi(routes.list, handlers.list)
    .openapi(routes.create, handlers.create)
    .openapi(routes.getOne, handlers.getOne)
    .openapi(routes.patch, handlers.patch);

export default router;
