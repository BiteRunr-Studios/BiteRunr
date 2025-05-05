FROM node:22-alpine AS base

FROM base AS builder

RUN apk add --no-cache gcompat
WORKDIR /app

# Copy dependency files first for better caching
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY src ./src

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies (including devDependencies for build)
RUN pnpm install

# Build the project (requires typescript in devDependencies)
RUN pnpm run build

# Remove devDependencies for production
RUN pnpm prune --prod

FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=builder --chown=hono:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=hono:nodejs /app/dist /app/dist
COPY --from=builder --chown=hono:nodejs /app/package.json /app/package.json

USER hono
EXPOSE 3000

CMD ["node", "/app/dist/index.js"]
