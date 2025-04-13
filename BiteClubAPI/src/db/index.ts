import env from "@/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

const connectionString = env.DATABASE_URL;

export const connection = postgres(connectionString, { prepare: false });

export const db = drizzle(connection, {
    schema,
    logger: true,
});

export default db;
