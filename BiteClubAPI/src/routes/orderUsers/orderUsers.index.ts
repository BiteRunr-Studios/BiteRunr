import { createRouter } from "@/lib/create-app";
import * as handlers from "./orderUsers.handlers";
import * as routes from "./orderUsers.routes";

const router = createRouter()
    .openapi(routes.list, handlers.list)
    .openapi(routes.create, handlers.create)
    .openapi(routes.getOne, handlers.getOne)
    .openapi(routes.patch, handlers.patch)
    .openapi(routes.remove, handlers.remove)
    .openapi(routes.getOrderUsers, handlers.getOrderUsers);

export default router;