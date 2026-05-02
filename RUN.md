🧪 Local Development (no Traefik)

```bash
docker compose -f docker-compose.base.yml -f docker-compose.dev.yml up -d --build
```

🏗️ Production (with Traefik + SSL)

```bash
docker compose -f docker-compose.base.yml -f docker-compose.prod.yml up -d --build
```
