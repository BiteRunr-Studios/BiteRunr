import { createRouter } from "@/lib/create-app";
import * as handlers from "./receiptDetails.handlers";
import * as routes from "./receiptDetails.routes";

const router = createRouter().openapi(routes.scanReceipt, handlers.scanReceipt);

export default router;
