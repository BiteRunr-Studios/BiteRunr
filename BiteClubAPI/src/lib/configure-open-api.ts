import { Scalar } from "@scalar/hono-api-reference";
import type { AppOpenAPI } from "./types";
import * as packageJSON from "../../package.json";

export default function configureOpenAPI(app: AppOpenAPI) {
    app.doc("/doc", {
        openapi: "3.0.0",
        info: {
            version: packageJSON.version,
            title: "BiteClub API",
        },
        security: [],
    });

    app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
    });

    app.get(
        "/scalar",
        Scalar({
            url: "/doc",
            layout: "classic",
            theme: "alternate",
            defaultHttpClient: {
                targetKey: "swift",
                clientKey: "nsurlsession",
            },
        })
    );
}
