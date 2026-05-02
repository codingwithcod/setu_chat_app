# 🚀 Run — Quick Reference

> **Note:** `make` is for Linux servers. On Windows, use the `docker compose` commands directly.

## Local Development

```bash
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up --build
```

Stop:
```bash
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml down
```

## Production (on Linux server)

```bash
make deploy
```

Or step by step:
```bash
make setup-supabase    # One-time: sets up self-hosted Supabase
make build             # Build the app image
make start-app         # Start App + Traefik
```

## All Commands

```bash
make help
```
