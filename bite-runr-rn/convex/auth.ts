import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { DataModel } from "./_generated/dataModel";

const CustomPassword = Password<DataModel>({
  profile(params) {
    return {
      email: params.email as string,
      firstName: params.firstName as string,
      lastName: params.lastName as string,
    };
  },
});

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    CustomPassword,
    GitHub,
    Google,
  ],
  callbacks: {
    // Transform OAuth profile to match our schema
    async createOrUpdateUser(ctx, args) {
      // Handle OAuth providers (GitHub, Google) which return name/image
      if (args.existingUserId) {
        // User exists, just return the ID
        return args.existingUserId;
      }

      // Extract profile data - OAuth provides 'name' and 'image'
      const profile = args.profile as {
        email?: string;
        name?: string;
        image?: string;
        firstName?: string;
        lastName?: string;
      };

      // Split full name into first/last if needed
      let firstName = profile.firstName ?? "";
      let lastName = profile.lastName ?? "";

      if (!firstName && profile.name) {
        const nameParts = profile.name.split(" ");
        firstName = nameParts[0] ?? "";
        lastName = nameParts.slice(1).join(" ") ?? "";
      }

      // Create the user with our schema
      const userId = await ctx.db.insert("users", {
        email: profile.email ?? "",
        firstName,
        lastName,
        avatarUrl: profile.image,
      });

      return userId;
    },
    // Allow redirects for React Native OAuth
    async redirect({ redirectTo }) {
      // Allow the biterunr:// app scheme for mobile OAuth
      if (redirectTo.startsWith("biterunr://")) {
        return redirectTo;
      }
      // Allow redirects to the Convex site (for mobile-callback intermediate page)
      const siteUrl = process.env.SITE_URL;
      if (siteUrl && redirectTo.startsWith(siteUrl)) {
        return redirectTo;
      }
      // Allow redirects to convex.site domain (mobile callback)
      if (redirectTo.includes(".convex.site")) {
        return redirectTo;
      }
      // Default to site URL
      return siteUrl ?? redirectTo;
    },
  },
});
