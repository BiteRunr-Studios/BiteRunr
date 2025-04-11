import createApp from "@/lib/create-app";
import configureOpenAPI from "@/lib/configure-open-api";
import index from "@/routes/index.route";
import users from "@/routes/users/users.index";
import orderItems from "@/routes/items/items.index";

const app = createApp();

const routes = [index, users, orderItems];
configureOpenAPI(app);
routes.forEach((route) => {
    app.route("/", route);
});

export default app;
