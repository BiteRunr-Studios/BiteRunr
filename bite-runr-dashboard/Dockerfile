FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.1 --activate

# Build stage
FROM base AS build
WORKDIR /app/bite-runr-dashboard

# Copy dashboard package files first for better caching
COPY bite-runr-dashboard/package.json bite-runr-dashboard/pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the convex directory that the symlink points to
COPY bite-runr-rn/convex /app/bite-runr-rn/convex

# Copy dashboard source
COPY bite-runr-dashboard/ .

# Remove the symlink and create a real link to the copied convex dir
RUN rm -f convex && ln -s /app/bite-runr-rn/convex convex

# Build
RUN pnpm build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/bite-runr-dashboard/.output .output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
