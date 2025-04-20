import app from "./app";
import { createNodeWebSocket } from "@hono/node-ws";
import { serve } from "@hono/node-server";
import env from "./env";
import type { MessageSource, WSMessage } from "@/lib/types";
import db from "./db";
import { orderItems } from "./db/schema";
import { eq } from "drizzle-orm";
import {
    insertOrderItemsSchema,
    patchOrderItemsSchema,
} from "./db/schema/orderItems";
import { z } from "zod";

const clients = new Set<WebSocket>();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

export function broadcast<T>(data: WSMessage<T>, exclude?: WebSocket) {
    for (const client of clients) {
        if (client !== exclude) {
            client.send(JSON.stringify(data));
        }
    }
}

async function handleDbOperation(msg: WSMessage) {
    const { type, payload } = msg;

    if (type === "create") {
        let insertPayload = insertOrderItemsSchema.parse(payload);
        await db.insert(orderItems).values(insertPayload);
    } else if (type === "update") {
        let patchPayload = patchOrderItemsSchema
            .extend({
                id: z.string(),
            })
            .parse(payload);
        await db
            .update(orderItems)
            .set(payload)
            .where(eq(orderItems.id, patchPayload.id));
    } else if (type === "delete") {
        let deletePayload = patchOrderItemsSchema
            .extend({
                id: z.string(),
            })
            .parse(payload);
        await db.delete(orderItems).where(eq(orderItems.id, deletePayload.id));
    }
}

app.get(
    "/ws",
    upgradeWebSocket(() => ({
        onOpen(event, ws) {
            clients.add(ws.raw);
        },
        async onMessage(event, ws) {
            const msg: WSMessage = JSON.parse(event.data.toString());

            if (msg.source === "client") {
                await handleDbOperation(msg);
            }
            if (msg.source === "webhook") {
                broadcast({ ...msg, source: "server" }, ws.raw);
            }
        },
        onClose(event, ws) {
            clients.delete(ws.raw);
        },
    }))
);

const server = serve(
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

injectWebSocket(server);
