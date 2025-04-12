import { z, ZodError } from "zod";
import { config } from "dotenv";
import { expand } from "dotenv-expand";

expand(config());

const EnvSchema = z.object({
    DATABASE_URL: z.string().nonempty(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
    PORT: z.coerce.number().default(3000),
    CLERK_SECRET_KEY: z.string().nonempty(),
});

export type env = z.infer<typeof EnvSchema>;

let env: env;
try {
    env = EnvSchema.parse(process.env);
} catch (e) {
    const error = e as ZodError;
    console.error("❌ Invalid env:");
    console.error(error.flatten().fieldErrors);
    process.exit(1);
}

export default env;
