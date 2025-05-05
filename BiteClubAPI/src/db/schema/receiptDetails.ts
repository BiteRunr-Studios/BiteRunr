import { z, ZodSchema } from "zod";

export const receiptDetails = z.object({
    items: z.array(
        z.object({
            name: z.string().nonempty(),
            unit_price: z.number().min(0),
            quantity: z.number().min(0),
        })
    ),
    subtotal: z.number().min(0),
    tax: z.number().min(0),
    total: z.number().min(0),
});
