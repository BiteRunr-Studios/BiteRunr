import { internalQuery } from "./_generated/server";

export const getAllItems = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("items").collect();
  },
});
