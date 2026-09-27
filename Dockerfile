FROM node:24-slim AS builder
WORKDIR /app

RUN corepack enable

COPY package*.json ./
RUN pnpm install

COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

FROM node:24-slim AS runner
WORKDIR /app

RUN corepack enable

COPY package*.json ./
RUN pnpm install --prod

COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
