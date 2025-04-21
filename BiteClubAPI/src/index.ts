import app from "./app";
import { serve } from "@hono/node-server";
import env from "./env";
import { streamSSE } from "hono/streaming";

export const subscribers: Map<string, Set<any>> = new Map();

app.get("/sse/order_items", (c) => {
    const orderId = c.req.query("orderId");
    if (!orderId) return c.json({ message: "Missing orderId" }, 400);

    return streamSSE(c, async (stream) => {
        if (!subscribers.has(orderId)) {
            subscribers.set(orderId, new Set());
        }
        subscribers.get(orderId)!.add(stream);

        stream.onAbort(() => {
            subscribers.get(orderId)!.delete(stream);
            if (subscribers.get(orderId)!.size === 0) {
                subscribers.delete(orderId);
            }
        });

        while (true) {
            await stream.sleep(60 * 60 * 1000);
        }
    });
});

serve(
    {
        fetch: app.fetch,
        port: env.PORT,
    },
    (info) => {
        console.log(
            `Server is running on http://localhost:${info.port}/scalar`
        );
    }
);
