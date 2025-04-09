import { Scalar } from '@scalar/hono-api-reference'
import type { AppOpenAPI } from "./types.js";
import packageJSON from "../../package.json" with { type: "json" };

export default function configureOpenAPI(app: AppOpenAPI) {
    app.doc("/doc", {
        openapi: "3.0.0",
        info: {
            version: packageJSON.version,
            title: "BiteClub API",
        },
    });

    app.get('/scalar', Scalar({ 
        url: '/doc',
        layout: "classic",
        theme: "alternate",
        defaultHttpClient: {
            targetKey: "swift",
            clientKey: "nsurlsession"
        },
    }));
}
