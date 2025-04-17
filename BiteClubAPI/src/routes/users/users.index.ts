import { createRouter } from "@/lib/create-app";
import * as handlers from "./users.handlers";
import * as routes from "./users.routes";

const router = createRouter()
    .openapi(routes.list, handlers.list)
    .openapi(routes.create, handlers.create)
    .openapi(routes.getOne, handlers.getOne)
    .openapi(routes.patch, handlers.patch)
    .openapi(routes.remove, handlers.remove)
    .openapi(routes.patchClerkId, handlers.patchClerkId)
    .openapi(routes.getFriends, handlers.getFriends)
    .openapi(routes.getFriendRequests, handlers.getFriendRequests)
    .openapi(routes.getOneByClerkId, handlers.getOneByClerkId);

export default router;
