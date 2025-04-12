import db from "@/db/index";
import { locations } from "@/db/schema/locations";
import type {
    CreateRoute,
    GetOneRoute,
    ListRoute,
    PatchRoute,
    RemoveRoute,
} from "./locations.routes";
import type { AppRouteHandler } from "@/lib/types";
import { selectLocationsSchema } from "@/db/schema/locations";
import * as HttpStatusCodes from "stoker/http-status-codes";
import * as HttpStatusPhrases from "stoker/http-status-phrases";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const locations = await db.query.locations.findMany();
    const validatedLocations = locations.map((location) =>
        selectLocationsSchema.parse(location)
    );
    return c.json(validatedLocations);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const newLocation = c.req.valid("json");
    const [inserted] = await db
        .insert(locations)
        .values(newLocation)
        .returning();
    return c.json(inserted, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const location = await db.query.locations.findFirst({
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

    const validatedLocation = selectLocationsSchema.parse(location);
    return c.json(validatedLocation, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    // Remove id from updates to prevent changing the id
    const { id: _, ...safeUpdates } = updates;
    const [updatedLocation] = await db
        .update(locations)
        .set(safeUpdates)
        .where(eq(locations.id, id))
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
        .delete(locations)
        .where(eq(locations.id, id))
        .returning();

    if (!deletedLocation) {
        return c.json(
            {
                message: HttpStatusPhrases.NOT_FOUND,
            },
            HttpStatusCodes.NOT_FOUND
        );
    }

    const validatedLocation = selectLocationsSchema.parse(deletedLocation);
    return c.json(validatedLocation, HttpStatusCodes.OK);
};
