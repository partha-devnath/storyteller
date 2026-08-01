# --- Stage 1: Base & Dependencies ---
FROM oven/bun:1 AS base
WORKDIR /app

# Copy repo configs and package manifests first to leverage Docker layer caching
COPY package.json bun.lock turbo.json tsconfig.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

# Install dependencies (including workspace packages)
RUN bun install

# --- Stage 2: Builder ---
FROM base AS builder
WORKDIR /app
# Copy the rest of the source code
COPY . .

RUN bun install
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
RUN bun run --cwd apps/web build:docker

# --- Stage 3: Runner ---
FROM oven/bun:1-slim AS runner
WORKDIR /app

# Copy the static build outputs from the builder stage
COPY --from=builder /app/apps/web/dist ./dist

# Install 'serve' globally or use bun x to serve static files
EXPOSE 5173
CMD ["bun", "x", "serve", "dist", "-p", "5173", "-s"]