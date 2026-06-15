# pretty-odysseus

A TypeScript reimplementation of [Odysseus](https://github.com/pewdiepie-archdaemon/odysseus) on TanStack Start.

## Setup

```bash
cp .env.example .env
# set ENCRYPTION_KEY:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm install
```

## Develop

Run the app natively against a Dockerized Postgres (fastest HMR):

```bash
docker compose up db -d   # start Postgres
npm run dev               # applies pending migrations, then app on http://localhost:3000
```

For LLM features, run Ollama on the host (`localhost:11434`) and add it as an endpoint in-app.

Or run the whole stack in Docker with the `dev` profile — Vite with HMR over a
bind mount, plus the Ollama container:

```bash
COMPOSE_PROFILES=cpu,dev docker compose up --build
```

Author new migrations against the dockerized dev DB with:

```bash
docker compose exec web-dev npm run prisma -- migrate dev --name <name>
```

## Production parity check

Build and run the production image against Postgres before pushing. The `web`
service runs under the `prod` profile, which the `.env.example` default
(`COMPOSE_PROFILES=cpu,prod`) supplies:

```bash
docker compose up --build
```
