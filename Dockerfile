FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm ci
COPY . .
RUN npm run prisma -- generate && npm run build

# Dev image: dependencies only. Source, the prisma schema, and the generated
# client are supplied by a bind mount at runtime (see web-dev in compose.yaml).
# Startup regenerates the prisma client, applies pending migrations via the
# `predev` hook, then serves Vite with HMR bound to all interfaces.
FROM node:24-bookworm-slim AS dev
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# Unprivileged, like the final stage. `node` is uid 1000, so what the container
# writes through the bind mount stays owned by the usual host account; npm runs
# as `node` so the anonymous node_modules volume seeds from a dir it owns.
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
CMD ["sh", "-c", "npm run prisma -- generate && npm run dev -- --host"]

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN npm ci --omit=dev
COPY --from=build /app/.output ./.output
COPY prisma.config.ts ./
COPY prisma ./prisma
# Run unprivileged; the runtime only reads these files and connects to Postgres.
USER node
EXPOSE 3000
CMD ["sh", "-c", "npm run prisma -- migrate deploy && node .output/server/index.mjs"]
