# syntax=docker/dockerfile:1

FROM node:26-trixie-slim AS base
WORKDIR /app
# The Prisma CLI needs OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# WORKDIR creates /app as root; node must own it to install and build.
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 npm ci

FROM base AS build
COPY --chown=node:node . .
RUN npm run prisma -- generate && npm run build

# Runs from the build stage because the runtime image has no Prisma CLI.
FROM build AS migrate
CMD ["npm", "run", "prisma", "--", "migrate", "deploy"]

# Source comes from the web-dev bind mount; the predev hook applies migrations.
FROM base AS dev
CMD ["sh", "-c", "npm run prisma -- generate && npm run dev -- --host"]

# No OpenSSL here: Prisma's runtime client doesn't need it.
FROM node:26-trixie-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
