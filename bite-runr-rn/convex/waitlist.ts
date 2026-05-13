import { v } from "convex/values";
import { Resend } from "resend";
import {
  query,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { api, internal } from "./_generated/api";

function getWaitlistAdminEmails(): Set<string> {
  const rawAdminEmails = process.env.WAITLIST_ADMIN_EMAILS;
  if (!rawAdminEmails) {
    throw new Error("WAITLIST_ADMIN_EMAILS not configured");
  }

  const adminEmails = rawAdminEmails
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (adminEmails.length === 0) {
    throw new Error("WAITLIST_ADMIN_EMAILS not configured");
  }

  return new Set(adminEmails);
}

export const insertEntry = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      return { alreadyJoined: true };
    }

    await ctx.db.insert("waitlist", {
      email: args.email,
      signedUpAt: Date.now(),
    });

    return { alreadyJoined: false };
  },
});

export const join = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(internal.waitlist.insertEntry, {
      email: args.email,
    });

    if (result.alreadyJoined) {
      return { alreadyJoined: true };
    }

    // Send confirmation email
    const resend = new Resend(process.env.AUTH_RESEND_KEY);
    await resend.emails.send({
      from: "BiteRunr <onboarding@biterunr.com>",
      to: [args.email],
      subject: "You're on the BiteRunr waitlist! 🎉",
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #FF8800;">You're on the list!</h1>
  <p>Thanks for signing up for BiteRunr — the easiest way to handle group food orders.</p>
  <p>We'll let you know as soon as we launch. In the meantime, tell your friends to join the waitlist too!</p>
  <p style="color: #888; margin-top: 24px; font-size: 12px;">— The BiteRunr Team</p>
</div>`,
    });

    return { alreadyJoined: false };
  },
});

export const getCount = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("waitlist").collect();
    return entries.length;
  },
});

export const listEntries = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("waitlist").collect();
  },
});

export const sendLaunchEmail = action({
  args: {
    subject: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) {
      throw new Error("Not authenticated");
    }

    const adminEmails = getWaitlistAdminEmails();
    if (!adminEmails.has(user.email.toLowerCase())) {
      throw new Error("Not authorized");
    }

    const resend = new Resend(process.env.AUTH_RESEND_KEY);
    const entries = await ctx.runQuery(internal.waitlist.listEntries);

    if (entries.length === 0) {
      return { sent: 0 };
    }

    const emails = entries.map((e) => e.email);

    // Resend batch API supports up to 100 emails per call
    const batches: string[][] = [];
    for (let i = 0; i < emails.length; i += 100) {
      batches.push(emails.slice(i, i + 100));
    }

    let sent = 0;
    for (const batch of batches) {
      const { error } = await resend.batch.send(
        batch.map((email) => ({
          from: "BiteRunr <onboarding@biterunr.com>",
          to: [email],
          subject: args.subject,
          html: args.html,
        })),
      );

      if (error) {
        console.error("Resend batch error:", error);
        throw new Error(`Failed to send batch: ${error.message}`);
      }
      sent += batch.length;
    }

    return { sent };
  },
});
