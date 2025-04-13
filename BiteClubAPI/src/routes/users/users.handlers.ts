import db from "@/db/index";
import { users } from "@/db/schema/index";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
} from "./users.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const users = await db.query.users.findMany();

    return c.json(users);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newUser = c.req.valid("json");
    const [inserted] = await db.insert(users).values(newUser).returning();

    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const user = await db.query.users.findFirst({
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
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
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
        .delete(users)
        .where(eq(users.id, id))
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
