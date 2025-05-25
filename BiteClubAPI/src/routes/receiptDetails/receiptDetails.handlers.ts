import type { CreateRoute } from "./receiptDetails.routes";
import type { AppRouteHandler } from "@/lib/types";
import * as HttpStatusCodes from "stoker/http-status-codes";
import OpenAI from "openai";
import { receiptDetails } from "@/db/schema/receiptDetails";

export const scanReceipt: AppRouteHandler<CreateRoute> = async (c) => {
    const reqData = c.req.valid("form");
    const file = reqData.file;

    if (!file || typeof file === "string") {
        return c.json(
            { message: "No file uploaded or file is not vali d." },
            HttpStatusCodes.BAD_REQUEST
        );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const mimeType = file.type || "image/png";

    const base64 = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const openai = new OpenAI();

    const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Analyze the following image and return a JSON array of the items ordered, with their unit price and quantity. Also add subtotal, tax and total at the end. Format like the following: {'items': [{ 'name': string, 'unit_price': number, 'quantity': number }], 'subtotal': number, 'tax': number, 'total': number }",
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: dataUrl,
                        },
                    },
                ],
            },
        ],
        response_format: { type: "json_object" },
    });

    const res = receiptDetails.parse(
        JSON.parse(response.choices[0].message.content ?? "")
    );

    return c.json(res, HttpStatusCodes.OK);
};
