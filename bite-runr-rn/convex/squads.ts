import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getUserId } from "./authHelper";
import { Id } from "./_generated/dataModel";

// List all squads the current user is a member of or created
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const created = await ctx.db
      .query("squads")
      .withIndex("by_creatorId", (q) => q.eq("creatorId", userId))
      .collect();

    // Also find squads where user is a member but not creator
    const allSquads = await ctx.db.query("squads").collect();
    const memberOf = allSquads.filter(
      (s) => s.creatorId !== userId && s.memberIds.includes(userId)
    );

    const squads = [...created, ...memberOf];

    // Resolve member details
    return Promise.all(
      squads.map(async (squad) => {
        const members = (
          await Promise.all(
            squad.memberIds.map(async (memberId) => {
              const user = await ctx.db.get(memberId as Id<"users">);
              return user
                ? { id: user._id, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl }
                : null;
            })
          )
        ).filter((m) => m !== null);

        const creator = await ctx.db.get(squad.creatorId);
        return {
          id: squad._id,
          name: squad.name,
          color: squad.color,
          icon: squad.icon,
          memberIds: squad.memberIds,
          members,
          isCreator: squad.creatorId === userId,
          creatorName: creator ? `${creator.firstName} ${creator.lastName}` : "",
        };
      })
    );
  },
});

// Create a new squad
export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    icon: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const name = args.name.trim();
    if (!name) throw new Error("Squad name is required");

    // Deduplicate memberIds and ensure creator is not in the list
    const memberIds = [...new Set(args.memberIds.filter((id) => id !== userId))];

    return ctx.db.insert("squads", {
      name,
      creatorId: userId,
      color: args.color,
      icon: args.icon,
      memberIds,
    });
  },
});

// Update an existing squad
export const update = mutation({
  args: {
    squadId: v.id("squads"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    memberIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const squad = await ctx.db.get(args.squadId);
    if (!squad) throw new Error("Squad not found");
    if (squad.creatorId !== userId) throw new Error("Not authorized");

    const patch: Partial<{ name: string; color: string; icon: string; memberIds: Id<"users">[] }> = {};
    if (args.name !== undefined) patch.name = args.name.trim();
    if (args.color !== undefined) patch.color = args.color;
    if (args.icon !== undefined) patch.icon = args.icon;
    if (args.memberIds !== undefined) {
      patch.memberIds = [...new Set(args.memberIds.filter((id) => id !== userId))];
    }

    await ctx.db.patch(args.squadId, patch);
    return true;
  },
});

// Delete a squad (creator only)
export const remove = mutation({
  args: { squadId: v.id("squads") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const squad = await ctx.db.get(args.squadId);
    if (!squad) throw new Error("Squad not found");
    if (squad.creatorId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.squadId);
    return true;
  },
});
