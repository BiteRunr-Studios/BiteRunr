import env from "@/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as users from "./schema/users";
import * as friends from "./schema/friends";
import * as friendRequests from "./schema/friendRequests";
import * as locations from "./schema/locations";
import * as orders from "./schema/orders";
import * as orderItems from "./schema/orderItems";
import * as orderUsers from "./schema/orderUsers";
import * as orderLocations from "./schema/orderLocations";

const connectionString = env.DATABASE_URL;

export const connection = postgres(connectionString, { prepare: false });

export const db = drizzle(connection, {
    schema: {
        ...users,
        ...friends,
        ...friendRequests,
        ...locations,
        ...orders,
        ...orderItems,
        ...orderUsers,
        ...orderLocations,
    },
    logger: true,
});

export default db;
