import { createRouter } from "@/lib/create-app";
import * as handlers from "./orders.handlers";
import * as routes from "./orders.routes";

const router = createRouter()
    .openapi(routes.list, handlers.list)
    .openapi(routes.create, handlers.create)
    .openapi(routes.getOne, handlers.getOne)
    .openapi(routes.patch, handlers.patch)
    .openapi(routes.remove, handlers.remove)
    .openapi(routes.listByUserId, handlers.listByUserId)
    .openapi(routes.listCompletedByUserId, handlers.listCompletedByUserId)
    .openapi(routes.orderItemsCount, handlers.orderItemsCount)
    .openapi(routes.allOrderLocations, handlers.allOrderLocations)
    .openapi(routes.locationItems, handlers.locationItems)
    .openapi(routes.changeOrderUserStatus, handlers.changeOrderUserStatus)
    .openapi(
        routes.addNewItemAndLinkToOrderUser,
        handlers.addNewItemAndLinkToOrderUser
    )
    .openapi(
        routes.addItemAndLinkToOrderUser,
        handlers.addItemAndLinkToOrderUser
    )
    .openapi(routes.awaitingOrder, handlers.awaitingOrder)
    .openapi(
        routes.userOrderItemsFromLocation,
        handlers.userOrderItemsFromLocation
    )
    .openapi(routes.editOrderItems, handlers.editOrderItems)
    .openapi(routes.removeOrderItem, handlers.removeOrderItem);

export default router;
