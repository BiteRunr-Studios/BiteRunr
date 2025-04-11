import createApp from "@/lib/create-app";
import configureOpenAPI from "@/lib/configure-open-api";
import index from "@/routes/index.route";
import users from "@/routes/users/users.index";
import orderItems from "@/routes/items/items.index";
import friends from "@/routes/friends/friends.index";
import orders from "@/routes/orders/orders.index";

const app = createApp();

const routes = [index, users, orderItems, friends, orders];
configureOpenAPI(app);
routes.forEach((route) => {
    app.route("/", route);
});

export default app;
