import { createRouter } from "@/lib/create-app.js";
import * as handlers from "./users.handlers.js";
import * as routes from "./users.routes.js";

const router = createRouter().openapi(routes.list, handlers.list);

export default router;
