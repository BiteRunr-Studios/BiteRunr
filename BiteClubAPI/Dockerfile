FROM node:22-alpine AS base

FROM base AS builder

RUN apk add --no-cache gcompat
WORKDIR /app

# Copy dependency files first for better caching
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Build the project
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
