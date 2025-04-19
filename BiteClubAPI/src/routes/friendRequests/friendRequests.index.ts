import { createRouter } from "@/lib/create-app";
import * as handlers from "./friendRequests.handlers";
import * as routes from "./friendRequests.routes";

const router = createRouter()
    .openapi(routes.list, handlers.list)
    .openapi(routes.create, handlers.create)
    .openapi(routes.getOne, handlers.getOne)
    .openapi(routes.patch, handlers.patch)
    .openapi(routes.remove, handlers.remove)
    .openapi(routes.getSentFriendRequests, handlers.getSentFriendRequests)
    .openapi(routes.acceptFriendRequest, handlers.acceptFriendRequest);

export default router;
