# Landing Website

This app is set up to deploy to Railway as its own service from the `/landing` directory.

## Railway

1. Create a new Railway service from this repo.
2. Set the service root directory to `/landing`.
3. Set the Railway config file path to `/landing/railway.toml`.
4. Deploy using the `Dockerfile` in this folder.
5. Add `VITE_CONVEX_URL` in the Railway service variables if you want the waitlist form to connect to Convex.

Railway will build the static site and serve `dist/` through Caddy on the port Railway assigns.

## Local

```bash
npm install
npm run dev
```
