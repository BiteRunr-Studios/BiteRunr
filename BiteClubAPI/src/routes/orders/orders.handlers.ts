import db from "@/db/index";
import { orders } from "@/db/schema/orders";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
} from "./orders.routes";
import type { AppRouteHandler } from "@/lib/types";
import { selectOrdersSchema } from "@/db/schema/orders";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const items = await db.query.orders.findMany();
    const validatedOrders = items.map((item) =>
        selectOrdersSchema.parse(item)
    );
    return c.json(validatedOrders);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newOrder = c.req.valid("json");
    const [inserted] = await db.insert(orders).values(newOrder).returning();
    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const order = await db.query.orders.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
    });

    if (!order) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const validatedOrder = selectOrdersSchema.parse(order);
    return c.json(validatedOrder, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const [updatedOrder] = await db
        .update(orders)
        .set(updates)
        .where(eq(orders.id, id))
        .returning();

    if (!updatedOrder) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const validatedOrder = selectOrdersSchema.parse(updatedOrder);
    return c.json(validatedOrder, HttpStatusCodes.OK);
};
