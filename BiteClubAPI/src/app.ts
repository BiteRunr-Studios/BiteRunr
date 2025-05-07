import createApp from "@/lib/create-app";
import configureOpenAPI from "@/lib/configure-open-api";
import index from "@/routes/index.route";
import users from "@/routes/users/users.index";
import friends from "@/routes/friends/friends.index";
import orders from "@/routes/orders/orders.index";
import friendRequests from "@/routes/friendRequests/friendRequests.index";
import locations from "@/routes/locations/locations.index";
import orderItems from "@/routes/orderItems/orderItems.index";
import orderLocations from "@/routes/orderLocations/orderLocations.index";
import orderUsers from "@/routes/orderUsers/orderUsers.index";
import items from "@/routes/items/items.index";
import receiptDetails from "@/routes/receiptDetails/receiptDetails.index";

const app = createApp();

const routes = [
    index,
    users,
    friends,
    friendRequests,
    orders,
    locations,
    items,
    orderItems,
    orderLocations,
    orderUsers,
    receiptDetails,
];
configureOpenAPI(app);
routes.forEach((route) => {
    app.route("/", route);
});

export default app;
