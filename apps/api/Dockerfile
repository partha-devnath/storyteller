FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

RUN bun install --frozen-lockfile

COPY . .

RUN bun install
RUN bun run --cwd apps/api build

FROM oven/bun:1-slim AS runner
WORKDIR /app

COPY --from=base /app/apps/api/dist ./dist

EXPOSE 3001
CMD ["bun", "dist/index.js"]
