# localghost

A local-first AI chat app: install whatever model you want (local via llama.cpp, or
bring your own cloud endpoint) and chat with it. Everything (accounts, chat
history, memory, endpoint keys) lives in your own Postgres. Nothing leaves your
host except the requests to a cloud endpoint you chose to add, and those keys are
encrypted at rest.

## Features

Capabilities are inline in chat or in Settings, never separate tabs.

- **Models.** Browse and install local GGUF models from the Library (backed by
  Hugging Face, downloaded and served by llama.cpp), or add a bring-your-own
  cloud endpoint: Anthropic, OpenAI, Google Gemini, OpenRouter, Groq, or any
  other OpenAI-compatible server (vLLM, LM Studio). Endpoint keys are encrypted
  at rest with `ENCRYPTION_KEY`.
- **Web search.** Toggle it per message. In Docker the bundled SearXNG is wired
  automatically; running natively, set `SEARXNG_URL` or the tool stays off.
- **Memory.** A long-term memory the model reads and writes, opt-in per message.
  Browse and edit entries in Settings.
- **Backup.** Export everything (conversations, endpoints, memory, settings) to a
  file and import it back. Import merges non-destructively.
- **Themes.** Light and dark with accent theming in Settings > Appearance.

## Requirements

- **Node 24+** and npm, to run the app natively.
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

The app throws on startup if any of the first three is missing or too weak, so set
real values before running. `SEARXNG_SECRET` only matters for the Docker profiles,
but Compose won't start without it. `DATABASE_URL` is interpolated from the
`POSTGRES_*` vars automatically; override it (or any `POSTGRES_*`) with a plain
`KEY=` line.

Optional: `SEARXNG_URL` enables the web-search tool when running natively (Docker
wires this for you, see below), `BETTER_AUTH_URL` sets the public origin behind a
reverse proxy, `HF_TOKEN` lifts Hugging Face's anonymous limits for the Library
catalog and bundled llama.cpp downloads, and `LLAMA_SLEEP_IDLE_SECONDS` (default
300) controls how long the bundled llama.cpp keeps an idle model loaded before
freeing its memory.

The **first account to sign up owns the instance**; sign-up is disabled once that
account exists.

## Develop

Everything runs in Docker Compose. `docker compose up --build` reads
`COMPOSE_PROFILES` and `COMPOSE_FILE` from `.env`, so you switch environments by
editing `.env` rather than by changing the command.

Develop with the `dev` profile: Vite with HMR over a bind mount, plus the llama.cpp
container (the `llamacpp` profile) and a bundled, keyless SearXNG so web search
works out of the box. In `.env`:

```bash
COMPOSE_PROFILES=llamacpp,dev
```

Then `docker compose up --build`. Pending migrations apply on start and the app is
on `http://localhost:3000`. The `dev` and `prod` profiles are mutually exclusive:
both bind port 3000.

Both app images run as the unprivileged `node` user, uid 1000, so whatever the
container writes through the bind mount stays owned by the usual host account.

npm commands run inside the `web-dev` container. Author new migrations with:

```bash
docker compose exec web-dev npm run prisma -- migrate dev --name <name>
```

### GPU access

On a GPU host, add the matching hardware overlay via `COMPOSE_FILE` in `.env` to
give both llama.cpp and the Library hardware panel GPU access (needs the matching
host GPU runtime). CPU hosts leave it unset.

```bash
COMPOSE_FILE=compose.yaml:compose.nvidia.yaml   # NVIDIA (NVIDIA Container Toolkit)
COMPOSE_FILE=compose.yaml:compose.amd.yaml      # AMD (ROCm)
COMPOSE_FILE=compose.yaml:compose.vulkan.yaml   # Vulkan (Intel, or AMD without ROCm)
```

Vulkan is the cross-vendor fallback (Intel Arc/iGPU, or AMD without ROCm): it
swaps in llama.cpp's Vulkan-enabled image and works once the container can reach
`/dev/dri`. The hardware panel has no Vulkan detection, so it still shows "No GPU
detected" under this overlay.

### Native fallback

Run the app on the host against a Dockerized Postgres:

```bash
docker compose up db -d   # start Postgres
npm run dev               # applies pending migrations, then app on http://localhost:3000
```

Only the app moves to the host, so migrations here are
`npm run prisma -- migrate dev --name <name>`.

For LLM features, run `llama-server` (router mode) on the host (`localhost:8080`)
and the app picks it up automatically. Add `--sleep-idle-seconds 300` (or your
own value) so an idle model frees its RAM/VRAM instead of sitting loaded after
you've moved on to another chat. Web search stays disabled until you set
`SEARXNG_URL` to a reachable SearXNG instance (the in-app tool explains this when
it is off).

## Deploy

The `prod` profile builds the production image (the `web` service) and serves it
on port 3000. It is mutually exclusive with the `dev` profile. In `.env`:

```bash
COMPOSE_PROFILES=prod        # prod,llamacpp to bundle llama.cpp too
```

Behind a reverse proxy, also set `BETTER_AUTH_URL` to the public origin the app is
served from so auth cookies and callbacks use the right host (it defaults to
`http://localhost:3000`):

```bash
BETTER_AUTH_URL="https://chat.example.com"
```

Then `docker compose up --build`. Point the proxy at port 3000 and terminate TLS
there. State persists in named volumes: Postgres in `pg`, models downloaded into
the bundled llama.cpp in `llamacpp`.

## Contributing

Bugs and pull requests go to
[GitHub issues](https://github.com/nghilbert/localghost/issues). No formal process:
open an issue first if the change is large, and run `npm run check` and
`npm run build` before you send a PR.

## License

Copyright (C) 2026 Nate. Licensed under the GNU General Public License v3.0 or
later. See [LICENSE](LICENSE) for the full text.
