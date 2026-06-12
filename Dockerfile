FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run prisma -- generate && npm run build

FROM node:24-alpine
# docker CLI: the app manages a sibling Ollama container through the host's
# Docker socket (mounted by compose.yaml).
RUN apk add --no-cache docker-cli
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY server.mjs prisma.config.ts ./
COPY prisma ./prisma
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.mjs"]
