import db from "@/db/index.js";
import { user } from "@/db/schema/index.js";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
} from "./users.routes.js";
import type { AppRouteHandler } from "@/lib/types.js";
import { selectUserSchema } from "@/db/schema/user.js";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const users = await db.query.user.findMany();
    const validatedUsers = users.map((user) => selectUserSchema.parse(user));
    return c.json(validatedUsers);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newUser = c.req.valid("json");
    const [inserted] = await db.insert(user).values(newUser).returning();
    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const user = await db.query.user.findFirst({
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

    const validatedUser = selectUserSchema.parse(user);
    return c.json(validatedUser, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const [updatedUser] = await db
        .update(user)
        .set(updates)
        .where(eq(user.id, id))
        .returning();

    if (!user) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedUser, HttpStatusCodes.OK);
};
