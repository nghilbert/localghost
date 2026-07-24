# localghost

A local-first AI chat app: install whatever model you want (local via Ollama, or
bring your own cloud endpoint) and chat with it. Everything (accounts, chat
history, memory, endpoint keys) lives in your own Postgres. Nothing leaves your
host except the requests to a cloud endpoint you chose to add, and those keys are
encrypted at rest.

## Setup

```bash
cp .env.example .env
npm install
```

Then fill in the three required secrets in `.env`:

| Variable | Purpose | Value |
|----------|---------|-------|
| `POSTGRES_PASSWORD` | Postgres password | any strong string |
| `BETTER_AUTH_SECRET` | signs auth sessions (min 32 chars) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ENCRYPTION_KEY` | encrypts stored endpoint API keys (64-char hex) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

The app throws on startup if any of these is missing or too weak, so set real
values before running. `DATABASE_URL` is interpolated from the `POSTGRES_*` vars
automatically; override it (or any `POSTGRES_*`) with a plain `KEY=` line.

Optional: `SEARXNG_URL` enables the web-search tool (Docker wires this for you,
see below), and `BETTER_AUTH_URL` sets the public origin behind a reverse proxy.

The **first account to sign up owns the instance**; sign-up is disabled once that
account exists.

## Develop

Run the app natively against a Dockerized Postgres (fastest HMR):

```bash
docker compose up db -d   # start Postgres
npm run dev               # applies pending migrations, then app on http://localhost:3000
```

For LLM features, run Ollama on the host (`localhost:11434`) and add it as an endpoint in-app.
Running natively, web search stays disabled until you set `SEARXNG_URL` to a
reachable SearXNG instance (the in-app tool explains this when it is off).

Or run the whole stack in Docker with the `dev` profile: Vite with HMR over a
bind mount, plus the Ollama container (the `ollama` profile) and a bundled,
keyless SearXNG so web search works out of the box:

```bash
COMPOSE_PROFILES=ollama,dev docker compose up --build
```

On a GPU host, append the matching hardware overlay via `COMPOSE_FILE` to give
both Ollama and the Library hardware panel GPU access (needs the matching host
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

## Deploy

The `prod` profile builds the production image (the `web` service) and serves it
on port 3000. It is mutually exclusive with the `dev` profile:

```bash
COMPOSE_PROFILES=prod docker compose up --build
COMPOSE_PROFILES=prod,ollama docker compose up --build   # add a bundled Ollama
```

Behind a reverse proxy, set `BETTER_AUTH_URL` in `.env` to the public origin the
app is served from so auth cookies and callbacks use the right host (it defaults
to `http://localhost:3000`):

```bash
BETTER_AUTH_URL="https://chat.example.com"
```

Point the proxy at port 3000 and terminate TLS there. State persists in named
volumes: Postgres in `pg`, models pulled into the bundled Ollama in `ollama`.

## Features

Capabilities are inline in chat or in Settings, never separate tabs.

- **Models.** Browse and install local models from the Library (Ollama), or add a
  bring-your-own cloud endpoint: Anthropic, OpenAI, Google Gemini, OpenRouter,
  Groq, or any OpenAI-compatible server (vLLM, LM Studio, llama.cpp). Endpoint
  keys are encrypted at rest with `ENCRYPTION_KEY`.
- **Web search.** Toggle it per message. In Docker the bundled SearXNG is wired
  automatically; running natively, set `SEARXNG_URL` or the tool stays off.
- **Memory.** A long-term memory the model reads and writes, opt-in per message.
  Browse and edit entries in Settings.
- **Backup.** Export everything (conversations, endpoints, memory, settings) to a
  file and import it back. Import merges non-destructively.
- **Themes.** Light and dark with accent theming in Settings > Appearance.

## License

Copyright (C) 2026 Nate. Licensed under the GNU General Public License v3.0 or
later. See [LICENSE](LICENSE) for the full text.
