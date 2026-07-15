# BiteRunr Admin

This workspace only serves the public BiteRunr privacy page.

## Cloudflare Workers

This app uses TanStack Start with the Cloudflare Vite plugin. The Worker config is in `wrangler.jsonc`; production builds emit the deployable Worker and static assets under `dist/`.

```bash
pnpm install
pnpm run cf:deploy
```

For local development, use `pnpm run dev`. To verify a production build before deploying, run `pnpm run build` and then `pnpm exec wrangler deploy --dry-run`.
