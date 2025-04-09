import env from "@/env.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

async function main() {
    const connectionString = env.DATABASE_URL;

    const client = postgres(connectionString, { prepare: false });
    const db = drizzle(client);
}

main();
