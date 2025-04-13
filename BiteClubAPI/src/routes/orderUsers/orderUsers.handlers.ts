import db from "@/db/index";
import { orderUsers } from "@/db/schema/orderUsers";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
} from "./orderUsers.routes";
import type { AppRouteHandler } from "@/lib/types";
import { selectOrderUsersSchema } from "@/db/schema/orderUsers";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const users = await db.query.orderUsers.findMany();
    const validatedUsers = users.map((user) =>
        selectOrderUsersSchema.parse(user)
    );

    return c.json(validatedUsers);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newUser = c.req.valid("json");
    const [inserted] = await db.insert(orderUsers).values(newUser).returning();

    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const user = await db.query.orderUsers.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
    });

    if (!user) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(user, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");

    const [updatedUser] = await db
        .update(orderUsers)
        .set(updates)
        .where(eq(orderUsers.id, id))
        .returning();

    if (!updatedUser) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedUser, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const [deletedUser] = await db
        .delete(orderUsers)
        .where(eq(orderUsers.id, id))
        .returning();

    if (!deletedUser) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(deletedUser, HttpStatusCodes.OK);
};
