# localghost

A local-first AI chat app: install whatever model you want (local via llama.cpp, or
bring your own cloud endpoint) and chat with it. Everything (accounts, chat
history, memory, endpoint keys) lives in your own Postgres. Nothing leaves your
host except the requests to a cloud endpoint you chose to add, and those keys are
encrypted at rest.

## Features

- **Models.** Browse and install local GGUF models from the Library (backed by
  Hugging Face, downloaded and served by llama.cpp), or add a bring-your-own
  cloud endpoint: Anthropic, OpenAI, Google Gemini, OpenRouter, Groq, or any
  other OpenAI-compatible server (vLLM, LM Studio). Endpoint keys are encrypted
  at rest with `ENCRYPTION_KEY`. Tune sampling per model in Settings > Models.
- **Web search.** Toggle it per message. In Docker the bundled SearXNG is wired
  automatically; running natively, set `SEARXNG_URL` or the tool stays off.
- **Memory.** A long-term memory the model reads and writes in every chat.
  Browse and edit entries in Settings.
- **Backup.** Export everything (conversations, endpoints, memory, settings) to a
  file and import it back. Import merges non-destructively.
- **Themes.** Light and dark modes with theme presets in Settings > Appearance.
- **Accounts.** The first account to sign up owns the instance; sign-up is
  disabled once that account exists.

## Requirements

- **Node 26** and npm, to run the app natively.
- **Docker** with Compose v2. Postgres runs in a container even in the native loop.
- **A GPU runtime**, only for GPU inference: NVIDIA Container Toolkit, ROCm, or
  Vulkan via `/dev/dri`. CPU-only needs none of them.

## Setup

```bash
cp .env.example .env
npm install
```

Then fill in the required secrets in `.env`:

| Variable | Purpose | Value |
|----------|---------|-------|
| `POSTGRES_PASSWORD` | Postgres password | any strong string |
| `BETTER_AUTH_SECRET` | signs auth sessions (min 32 chars) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ENCRYPTION_KEY` | encrypts stored endpoint API keys (64-char hex) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SEARXNG_SECRET` | required by the bundled SearXNG (Docker web search) | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

The app throws on startup if any of the first three is missing or too weak.
`SEARXNG_SECRET` only matters for the Docker profiles, but Compose won't start
without it. `DATABASE_URL` is built from the `POSTGRES_*` variables; override it
(or any `POSTGRES_*`) with a plain `KEY=` line.

Optional:

| Variable | Purpose |
|----------|---------|
| `SEARXNG_URL` | enables web search when running natively (Docker sets it for you) |
| `BETTER_AUTH_URL` | the public origin behind a reverse proxy (default `http://localhost:3000`) |
| `HF_TOKEN` | lifts Hugging Face's anonymous limits for the Library and bundled llama.cpp downloads |
| `LLAMA_ARG_SLEEP_IDLE_SECONDS` | how long the bundled llama.cpp keeps an idle model loaded (default 300) |

## Develop

Everything runs in Docker Compose. `docker compose up --build` reads
`COMPOSE_PROFILES` and `COMPOSE_FILE` from `.env`, so you switch environments by
editing `.env` rather than the command.

The `dev` profile runs Vite with HMR over a bind mount, and the `llamacpp` profile
adds the bundled llama.cpp. A keyless SearXNG runs in every profile. In `.env`:

```bash
COMPOSE_PROFILES=llamacpp,dev
```

Then `docker compose up --build`. Pending migrations apply on start and the app is
on `http://localhost:3000`. The `dev` and `prod` profiles both bind port 3000, so
use one at a time.

npm commands run inside the `web-dev` container. Author new migrations with:

```bash
docker compose exec web-dev npm run prisma -- migrate dev --name <name>
```

### GPU access

On a GPU host, add the matching overlay via `COMPOSE_FILE` in `.env` to give
llama.cpp and the Library hardware panel GPU access. CPU hosts leave it unset.

```bash
COMPOSE_FILE=compose.yaml:compose.nvidia.yaml   # NVIDIA (NVIDIA Container Toolkit)
COMPOSE_FILE=compose.yaml:compose.amd.yaml      # AMD (ROCm)
COMPOSE_FILE=compose.yaml:compose.vulkan.yaml   # Vulkan (Intel, or AMD without ROCm)
```

The Vulkan overlay swaps in llama.cpp's Vulkan image and needs `/dev/dri`. The
hardware panel has no Vulkan detection, so it shows "No GPU detected" under this
overlay.

### Native fallback

Run the app on the host against a Dockerized Postgres:

```bash
docker compose up db -d   # start Postgres
npm run dev               # applies pending migrations, then app on http://localhost:3000
```

Migrations here are `npm run prisma -- migrate dev --name <name>`. For LLM
features, run `llama-server` in router mode on `localhost:8080` and the app picks
it up. Web search stays off until `SEARXNG_URL` points at a SearXNG instance.

### Tests

```bash
npm run test -- run
```

The `server` project runs against a real Postgres at `TEST_DATABASE_URL` (see
`.env.example`), starting the Compose `db` service first if nothing is listening
there. It resets that database on every run and copies it to one
`<name>_<n>` database per test worker, so keep it separate from `DATABASE_URL`.

## Deploy

The `prod` profile builds the production image (the `web` service) and serves it
on port 3000. In `.env`:

```bash
COMPOSE_PROFILES=prod        # prod,llamacpp to bundle llama.cpp too
```

Behind a reverse proxy, also set `BETTER_AUTH_URL` to the public origin so auth
cookies and callbacks use the right host:

```bash
BETTER_AUTH_URL="https://chat.example.com"
```

Then `docker compose up --build`. Point the proxy at port 3000 and terminate TLS
there. State persists in named volumes: Postgres in `pg`, models downloaded into
the bundled llama.cpp in `llamacpp`.

## Contributing

Report bugs and send pull requests on
[GitHub](https://github.com/nghilbert/localghost/issues). Open an issue first for
large changes, and run `npm run biome check`, `npm run build`, and
`npm run test -- run` before sending a PR.

## License

Copyright (C) 2026 Nate. Licensed under the GNU General Public License v3.0 or
later. See [LICENSE](LICENSE) for the full text.
