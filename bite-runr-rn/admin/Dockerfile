FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Build stage
FROM base AS build
WORKDIR /app

# Copy admin package files first for better caching
COPY admin/package.json admin/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy admin source
COPY admin/ .

# Replace the symlink with the actual convex files so they can resolve node_modules
RUN rm -f convex
COPY convex ./convex

# Pass Vite env vars at build time (Vite bakes VITE_* into the bundle)
ARG VITE_CONVEX_URL
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL

# Build
RUN pnpm build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/.output .output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
