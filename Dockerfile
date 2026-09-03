FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
COPY --chown=node:node . .
RUN npm run prisma -- generate && npm run build

# Pre-deploy step: applies pending migrations before the server starts (see the
# migrate service in compose.yaml). The prisma CLI needs the dependency tree and
# prisma/, neither of which the runtime image carries; this stage already has both.
FROM build AS migrate
CMD ["npm", "run", "prisma", "--", "migrate", "deploy"]

# Dev image: dependencies only. Source, the prisma schema, and the generated
# client are supplied by a bind mount at runtime (see web-dev in compose.yaml).
# Startup regenerates the prisma client, applies pending migrations via the
# `predev` hook, then serves Vite with HMR bound to all interfaces.
FROM node:26-bookworm-slim AS dev
WORKDIR /app
# git: /agent's harness shells out to it. bubblewrap/socat: Claude Code's own Bash
# sandbox. The harness runs in this container, not a separate one.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates git bubblewrap socat \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g @anthropic-ai/claude-code
# Unprivileged, like the final stage. `node` is uid 1000, so what the container
# writes through the bind mount stays owned by the usual host account; npm runs
# as `node` so the anonymous node_modules volume seeds from a dir it owns.
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci
CMD ["sh", "-c", "npm run prisma -- generate && npm run dev -- --host"]

FROM node:26-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates git bubblewrap socat \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g @anthropic-ai/claude-code
COPY --from=build /app/.output ./.output
# Run unprivileged. Migrations run beforehand in the migrate service (see
# compose.yaml), so this stage carries only .output.
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
