import db from "@/db/index";
import { orderLocations } from "@/db/schema/orderLocations";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
} from "./orderLocations.routes";
import type { AppRouteHandler } from "@/lib/types";
import { selectOrderLocationsSchema } from "@/db/schema/orderLocations";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const locations = await db.query.orderLocations.findMany();
    const validatedLocations = locations.map((location) =>
        selectOrderLocationsSchema.parse(location)
    );

    return c.json(validatedLocations);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newLocation = c.req.valid("json");
    const [inserted] = await db
        .insert(orderLocations)
        .values(newLocation)
        .returning();

    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const location = await db.query.orderLocations.findFirst({
        where(fields, operators) {
            return operators.eq(fields.id, id);
        },
    });

    if (!location) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(location, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");

    const [updatedLocation] = await db
        .update(orderLocations)
        .set(updates)
        .where(eq(orderLocations.id, id))
        .returning();

    if (!updatedLocation) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(updatedLocation, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const [deletedLocation] = await db
        .delete(orderLocations)
        .where(eq(orderLocations.id, id))
        .returning();

    if (!deletedLocation) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    return c.json(deletedLocation, HttpStatusCodes.OK);
};
