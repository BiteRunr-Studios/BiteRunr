FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm@9.15.1

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]