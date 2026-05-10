# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BiteRunr — an Expo/React Native mobile app for coordinating group food orders. One person ("the runner") collects orders from friends, picks up food from one or more locations, scans the receipt, and the app fans out per-line settlement back to each member with Stripe Connect card payments.

The repo also contains two unrelated sibling apps in `admin/` and `landing/` (both Vite, with their own dependencies and Convex deployments). The TypeScript project explicitly excludes `admin/`. The mobile app is what this file describes.

## Common commands

```bash
# Day-to-day dev (every command below also runs sync-styles first)
npm run dev                # expo start --clear (Metro)
npm run ios                # build + run on simulator
npm run android            # build + run on emulator
npm run phone              # build + run on a physical iPhone
npm run web                # web target
npm run prebuild           # regenerate ios/ + android/ native projects

# Convex backend (two deployments exist — pick one)
npm run convex:br          # production project (biterunr-d182d)
npm run convex:brtest      # test project (biterunrtest) — what .env.local is currently set to

# EAS production builds (local)
npm run eas:build          # iOS .ipa
npm run eas:build:android  # Android .aab
```

There is no test runner, no linter command, and no typecheck script — type errors surface through Metro and the editor. Run `npx tsc --noEmit` if you want a one-shot typecheck.

`npm run sync-styles` (auto-runs before every `expo` command) parses `global.css` CSS variables into `tokens.json` so JS code can read theme HSL values at build time. **If you edit CSS variables in `global.css`, regenerate `tokens.json`** — otherwise `lib/constants.ts` (`NAV_THEME`) gets out of sync.

## Required local files (gitignored)

- `.env.local` — `CONVEX_DEPLOYMENT`, `EXPO_PUBLIC_CONVEX_URL`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_SITE_URL`.
- `app.config.local.ts` (or `.js`) — exports `{ owner, extra: { eas: { projectId } } }`. `app.config.ts` requires this file and merges it in; without it, Expo `owner` and `eas.projectId` are empty strings. Each developer keeps their own.
- `ios/` and `android/` are gitignored — they're prebuild output. Don't hand-edit unless you're intentionally maintaining native config; usually edit `app.config.ts` and re-run `expo prebuild`.

## Architecture

### Routing (Expo Router, file-based)

- `app/_layout.tsx` mounts the provider stack: `StripeProvider` → `ConvexBetterAuthProvider` → `AuthProvider` → `ThemeProvider` → `SafeAreaProvider` → `RootAppShell`. The animated splash overlay (`AnimatedSplashScreen`) stays mounted on top of the Stack until `isReady && !isLoading && fontsLoaded`.
- Three top-level routes: `(auth)`, `(protected)`, `join/[code]` (modal). `(protected)/_layout.tsx` redirects to `/(auth)/sign-in` once auth resolves to "not logged in", and on first entry calls `api.users.syncUser` to materialize the app's `users` row for OAuth users.
- Inside `(protected)`: native tabs (`(tabs)/index`, `groups`, `account`), `order/[orderId]` and sibling order screens (`create`, `items`, `summary`, `settlement`, `my-settlement`, `completed-order`), and `account/*` screens.

### Auth (Better Auth on Convex, dual user tables)

This is the part most likely to bite you.

- The auth source of truth lives in the **Better Auth Convex component** (`@convex-dev/better-auth`), mounted in `convex/convex.config.ts`. It owns its own `user`, `session`, `account`, etc. tables inside the component — not the app schema.
- The app schema in `convex/schema.ts` defines its **own** `users` table (with `firstName`/`lastName`/`avatarUrl`/`stripeCustomerId`). This is the table all app code references via `Id<"users">`.
- The two are linked by **email**: `convex/authHelper.ts` looks up the Better Auth user, then queries `users` by the `email` index. Helpers:
  - `getUserId(ctx)` — returns `Id<"users"> | null` (queries and mutations).
  - `requireUserId(ctx)` — throws if missing. **Don't use this in mutations that may run on a fresh OAuth user** — it'll throw.
  - `ensureUser(ctx)` / `requireUserIdWithSync(ctx)` — mutation-only; creates the app `users` row from Better Auth data on demand. The `(protected)` layout also calls `api.users.syncUser` proactively on first entry, so for normal flows the row exists by the time mutations run.
- Frontend auth state lives in `lib/convex-auth-context.tsx`. It wraps `authClient.useSession()` and **only flips `isReady` true once** — subsequent refetches don't re-trigger loading UI. Use `useAuth()` to read `isLoggedIn`/`user`/`signOut`/`refreshSession`.
- `lib/auth-client.ts` constructs the Better Auth client with the Expo plugin (SecureStore) + email-OTP plugin + Convex plugin. Site URL is derived from `EXPO_PUBLIC_CONVEX_URL` by swapping `.cloud` → `.site`.
- OTP emails go through Resend in `convex/auth.ts`. Social providers (Google, GitHub, Apple) are conditionally enabled based on env var presence — if any are configured, `SITE_URL` becomes mandatory and the file throws on boot otherwise.

### Money & payments

- **All monetary fields are `int64` cents** in the schema (`priceInCents`, `amountOwed`, `receiptTotalInCents`, `amount`, `platformFee`). Don't round-trip through floats.
- `convex/fees.ts` is the **single source of truth** for the platform fee (5% with $1.00 minimum). Both `stripeConnect.ts` (charge creation) and `payments.ts` (UI display) import `calculatePlatformFee` from there. Don't duplicate this calculation.
- Settlement model: members pay the runner via Stripe Connect (`stripePayments` table, `connectedAccounts` table for runners). Buyers also pay platform fees upfront — fees are added on top of what they owe, not deducted from runner payouts.
- Settlement statuses: `unpaid` → `claimed` → `confirmed`, plus `settled_in_person` for cash splits.

### Design system

There are **two style systems coexisting** — be explicit about which you're using:

1. **NativeWind / Tailwind** with shadcn-style HSL CSS variables in `global.css`, dark mode via the `.dark` class. Tailwind config in `tailwind.config.js` reads `--background`, `--foreground`, `--primary`, etc. Used in older screens and React Navigation theming (`lib/constants.ts` → `NAV_THEME` derived from `tokens.json`).
2. **BR design system** (newer, in `components/br/` — `BrText`, `BrCard`, `BrButton`, `BrChip`, `BrAvatar`, `BrSticker`, `BrInput`). Uses StyleSheet with the orange-forward palette in `lib/br-theme.ts` (`BR.orange`, `BR.paper`, `BR.ink`, etc.) and Bricolage Grotesque + JetBrains Mono fonts. Tokens: `BR_RADIUS`, `BR_FONT`, `BR_SHADOW`.

Newer screens (the recent UI redesign — see recent git log) lean on the BR system. When extending the BR design, look at existing components in `components/br/` for variant patterns rather than introducing new conventions.

`components/common/` contains older shared UI (button, input, container, skeleton, error-boundary, animated-pressable, icon).

### Convex backend layout

`convex/` is mostly flat with each domain in one file. Largest/most-used:

- `orders.ts` — order CRUD, member management, status transitions.
- `orderItems.ts` — per-line items, the bulk of order-write logic.
- `orderLocations.ts` / `orderUsers.ts` / `orderInvites.ts` — supporting tables. `orderInvites` powers QR-code group joining (8-char alphanumeric `code`, optional `maxUses`).
- `receiptScanning.ts` — vision-LLM receipt parsing via OpenRouter + `ai` SDK with a Zod schema, then fuzzy matching against existing order items (`lib/order-item-grouping.ts` + `lib/fuzzy-match.ts`) so receipt lines get assigned back to the right person.
- `payments.ts`, `stripeConnect.ts`, `fees.ts` — the payment stack.
- `pushNotifications.ts` — wraps `@convex-dev/expo-push-notifications` (registered in `convex.config.ts`); frontend hook is `lib/hooks/use-push-notifications.ts`.
- `squads.ts` — user-named friend groups (`color`, `icon`, `memberIds`).
- `friends.ts`, `users.ts`, `waitlist.ts` — straightforward.
- `http.ts` — registers Better Auth HTTP routes plus `/mobile-callback` redirector for OAuth.

### Path alias

`@/*` resolves to repo root, so imports look like `@/convex/_generated/api`, `@/components/br`, `@/lib/br-theme`. Use this rather than relative paths.

### Worth knowing

- React Compiler is enabled (`experiments.reactCompiler: true` in `app.config.ts`). Don't add unnecessary `useMemo`/`useCallback` to satisfy it; conversely, don't fight it with manual memoization. The babel plugin `react-native-worklets/plugin` runs alongside it.
- Typed routes are on (`experiments.typedRoutes: true`) — generated route types live under `.expo/types`.
- Metro config enables `unstable_enablePackageExports: true` (NativeWind setup).
- The custom `convexLogger` in `app/_layout.tsx` swallows Better Auth "invalid password / invalid credentials" log spam — those errors are surfaced in the UI instead. If you're debugging an auth issue and don't see expected logs, that's why.
- Pre-built artifacts `build.aab` and `build.ipa` (~28–88 MB) sit at the repo root. `.gitignore` excludes them, but they're checked-in copies from a past local build — don't rely on them being current.
