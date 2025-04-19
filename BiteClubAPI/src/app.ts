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
import webhooks from "@/routes/webhooks/webhooks.index";

const app = createApp();

const routes = [
    index,
    users,
    orderItems,
    friends,
    friendRequests,
    orders,
    locations,
    orderItems,
    orderLocations,
    orderUsers,
    webhooks,
] as const;

configureOpenAPI(app);
routes.forEach((route) => {
    app.route("/", route);
});

export default app;
