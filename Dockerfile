# syntax=docker/dockerfile:1

FROM node:26-trixie-slim AS base
WORKDIR /app
# Node 25+ ships without Corepack, so pnpm comes from its official image, pinned to `packageManager`.
COPY --from=ghcr.io/pnpm/pnpm:12.19.0 /opt/pnpm /opt/pnpm
RUN for bin in pnpm pnpx; do ln -s "/opt/pnpm/$bin" "/usr/local/bin/$bin"; done
# The Prisma CLI needs OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# WORKDIR creates /app as root; node must own it to install and build.
RUN chown node:node /app
USER node
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,target=/home/node/.cache/pnpm-store,uid=1000,gid=1000 \
  pnpm install --frozen-lockfile --store-dir /home/node/.cache/pnpm-store

FROM base AS build
COPY --chown=node:node . .
RUN pnpm prisma generate && pnpm build

# Runs from the build stage because the runtime image has no Prisma CLI.
FROM build AS migrate
CMD ["pnpm", "prisma", "migrate", "deploy"]

# Source comes from the web-dev bind mount; the predev hook applies migrations.
FROM base AS dev
CMD ["sh", "-c", "pnpm prisma generate && pnpm dev --host"]

# No OpenSSL here: Prisma's runtime client doesn't need it.
FROM node:26-trixie-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
