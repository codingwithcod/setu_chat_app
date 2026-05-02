# Setu Chat App

A real-time chat application built with Next.js, Supabase, and TypeScript.

## Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Radix UI
- **Backend:** Supabase (Auth, Realtime, Storage, PostgreSQL)
- **Desktop:** Tauri
- **Deployment:** Docker, Traefik, Self-hosted Supabase

## Getting Started

### Prerequisites

- Node.js 16+
- npm

### Installation

```bash
git clone <repo-url>
cd setu_chat_app
npm install
cp .env.example .env   # then fill in your Supabase credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Docker Deployment

See [RUN.md](./RUN.md) for quick commands.

### Architecture

```
Internet → Traefik (:443) → chat.theabhipatel.com      → Setu App (:3000)
                           → supabase.chat.theabhipatel.com → Supabase Kong (:8000)
                           → traefik.chat.theabhipatel.com  → Traefik Dashboard
```

All services communicate via a shared Docker network (`setu-network`).

### File Structure

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build (deps → build → standalone runner) |
| `.dockerignore` | Excludes node_modules, .git, src-tauri from build context |
| `docker-compose.base.yml` | Shared service definition (build, env, healthcheck) |
| `docker-compose.dev.yml` | Local dev — maps port 3000, no Traefik |
| `docker-compose.prod.yml` | Production — Traefik + Let's Encrypt SSL |
| `Makefile` | All commands in one place (`make deploy`, `make dev`, etc.) |
| `scripts/setup-supabase.sh` | Idempotent Supabase self-hosting setup |

### Compose Strategy (Base + Override)

```bash
# Dev:  base + dev override
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up --build

# Prod: base + prod override
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --build
```

### Self-Hosted Supabase

The `make deploy` command automatically checks if Supabase is running. If not, it runs `scripts/setup-supabase.sh` which:

1. Clones the official [supabase/supabase](https://github.com/supabase/supabase) repo
2. Copies Docker files to `../supabase-project/`
3. Generates secure secrets (passwords, JWT keys, etc.)
4. Configures domain URLs
5. Patches Supabase's compose to join the shared network
6. Pulls images and starts all 13 services

After first setup, credentials are saved to `../supabase-project/.credentials`.

### Server Directory Layout

```
/your/path/
├── setu_chat_app/             ← This repo
│   ├── Makefile
│   ├── scripts/setup-supabase.sh
│   ├── docker-compose.*.yml
│   └── ...
└── supabase-project/          ← Auto-created by setup script
    ├── docker-compose.yml
    ├── .env
    ├── .credentials
    └── volumes/
```

### DNS Requirements

| A Record | Points To |
|---|---|
| `chat.theabhipatel.com` | Your server IP |
| `supabase.chat.theabhipatel.com` | Your server IP |
| `traefik.chat.theabhipatel.com` | Your server IP |

### Makefile Commands

| Command | Description |
|---|---|
| `make dev` | Run locally (port 3000) |
| `make deploy` | Full production deploy |
| `make build` | Build app image |
| `make start-app` | Start App + Traefik |
| `make stop-app` | Stop App + Traefik |
| `make restart-app` | Restart App + Traefik |
| `make setup-supabase` | Setup Supabase (idempotent) |
| `make start-supabase` | Start Supabase |
| `make stop-supabase` | Stop Supabase |
| `make status` | Health of all services |
| `make logs` | Tail App + Traefik logs |
| `make logs-supabase` | Tail Supabase logs |
| `make down` | Stop App (keep Supabase) |
| `make down-all` | Stop everything |
| `make clean` | Remove all (⚠️ destructive) |

### SSL Certificates

Certificates are stored in a Docker named volume (`traefik-letsencrypt`). They persist across `docker compose down/up` and container rebuilds. Only lost if you explicitly delete the volume.

### Server Requirements

- **Minimum:** 4 GB RAM, 2 CPUs (Supabase alone)
- **Recommended:** 8 GB RAM, 2-4 CPUs (with App + Traefik)

## Environment Variables

See [.env.example](./.env.example) for all required variables.

## License

Private
