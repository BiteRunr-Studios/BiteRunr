import type { MiddlewareHandler } from "hono";
import { verifyToken } from "@clerk/backend";
import * as HttpStatusCodes from "stoker/http-status-codes";
import env from "@/env";

export const authMiddleware: MiddlewareHandler = async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return c.text(
            "Unauthorized: Missing token",
            HttpStatusCodes.UNAUTHORIZED
        );
    }

    const token = authHeader.replace("Bearer ", "");
    try {
        const verifiedToken = await verifyToken(token, {
            secretKey: env.CLERK_SECRET_KEY,
            // authorizedParties: [
            //     "com.RunrStudios.BiteRunr",
            //     "http://localhost:3000",
            // ], // match bundle ID or url
        });

        console.log(verifiedToken.sub);
        // Store user ID in context for later use
        c.set("userId", verifiedToken.sub);
        await next();
    } catch (err) {
        console.error("Token verification failed:", err);
        return c.text(
            "Unauthorized: Invalid token",
            HttpStatusCodes.UNAUTHORIZED
        );
    }
};
