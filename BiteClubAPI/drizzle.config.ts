import { defineConfig } from "drizzle-kit";
import env from "@/env";

export default defineConfig({
    out: "./src/db/migrations",
    schema: "./src/db/schema/index.ts",
    dialect: "postgresql",
    dbCredentials: {
        url: env.DATABASE_URL,
    },
    verbose: true,
    strict: true,
    schemaFilter: ["public", "auth"]
});
