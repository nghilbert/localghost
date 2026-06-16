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
bind mount, plus the Ollama container (the `ollama` profile):

```bash
COMPOSE_PROFILES=ollama,dev docker compose up --build
```

On a GPU host, append the matching hardware overlay via `COMPOSE_FILE` to give
both Ollama and the cookbook hardware panel GPU access (needs the matching host
GPU runtime). CPU hosts leave it unset.

```bash
COMPOSE_FILE=compose.yaml:compose.nvidia.yaml   # NVIDIA (NVIDIA Container Toolkit)
COMPOSE_FILE=compose.yaml:compose.amd.yaml      # AMD (ROCm)
COMPOSE_FILE=compose.yaml:compose.vulkan.yaml   # Vulkan (Intel, or AMD without ROCm)
```

Vulkan is the cross-vendor fallback (Intel Arc/iGPU, or AMD without ROCm): it's
bundled into the default Ollama image and enabled once the container can reach
`/dev/dri`. The hardware panel has no Vulkan detection, so it still shows "No GPU
detected" under this overlay.

Author new migrations against the dockerized dev DB with:

```bash
docker compose exec web-dev npm run prisma -- migrate dev --name <name>
```

## Production parity check

Build and run the production image against Postgres before pushing. The `web`
service runs under the `prod` profile, which the `.env.example` default
(`COMPOSE_PROFILES=ollama,prod`) supplies:

```bash
docker compose up --build
```
