import app from "./app";
import { createNodeWebSocket } from "@hono/node-ws";
import { serve } from "@hono/node-server";
import env from "./env";

const clients = new Set<WebSocket>();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.get(
    "/ws",
    upgradeWebSocket(() => ({
        onOpen(event, ws) {
            clients.add(ws.raw);
        },
        onMessage(event, ws) {
            const message = event.data;
            for (const client of clients) {
                client.send(`Broadcast: ${message}`);
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
