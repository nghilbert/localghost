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

Run the app natively against a Dockerized Postgres:

```bash
docker compose up db -d   # start Postgres
npm run dev               # applies pending migrations, then app on http://localhost:3000
```

For LLM features, run Ollama on the host (`localhost:11434`) and add it as an endpoint in-app.

## Production parity check

Build and run the production image against Postgres before pushing:

```bash
docker compose up --build
```
