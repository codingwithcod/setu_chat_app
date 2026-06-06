# ============================================
#  Setu Chat App — Makefile
#  Single entry point for all operations
# ============================================
#  Usage:
#    make help        — Show all commands
#    make dev         — Run locally (no Traefik, no Supabase)
#    make deploy      — Full production deploy (Supabase + App + Traefik)
#    make down        — Stop everything
# ============================================

.PHONY: help dev deploy down logs status \
        build restart-app restart-supabase \
        setup-supabase start-supabase stop-supabase \
        start-app stop-app clean network migrate

# ------------------------------------------
# Configuration
# ------------------------------------------
COMPOSE_BASE   = docker compose -f docker-compose.base.yml
COMPOSE_DEV    = $(COMPOSE_BASE) -f docker-compose.dev.yml
COMPOSE_PROD   = $(COMPOSE_BASE) -f docker-compose.prod.yml
SUPABASE_DIR   = ../supabase-project
COMPOSE_SUPA   = docker compose -f $(SUPABASE_DIR)/docker-compose.yml
SHARED_NETWORK = setu-network

# ------------------------------------------
# Default target
# ------------------------------------------
help: ## Show this help message
	@echo ""
	@echo "  Setu Chat App — Available Commands"
	@echo "  ==================================="
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ==========================================
#  🧪  LOCAL DEVELOPMENT
# ==========================================

dev: ## Run app locally (port 3000, no Traefik/Supabase)
	$(COMPOSE_DEV) up --build

dev-d: ## Run app locally in background
	$(COMPOSE_DEV) up -d --build
	@echo ""
	@echo "  ✅ App running at http://localhost:3000"
	@echo ""

dev-down: ## Stop local dev containers
	$(COMPOSE_DEV) down

# ==========================================
#  🚀  PRODUCTION DEPLOYMENT
# ==========================================

deploy: network setup-supabase migrate build start-app ## Full deploy: Supabase + App + Traefik
	@echo ""
	@echo "  ============================================"
	@echo "  ✅  Deployment Complete!"
	@echo "  ============================================"
	@echo "  🌐 App:       https://chat.theabhipatel.com"
	@echo "  📊 Supabase:  https://supabase.chat.theabhipatel.com"
	@echo "  🔧 Traefik:   https://traefik.chat.theabhipatel.com"
	@echo "  ============================================"
	@echo ""

network: ## Create shared Docker network (if not exists)
	@docker network inspect $(SHARED_NETWORK) >/dev/null 2>&1 || \
		(echo "Creating network $(SHARED_NETWORK)..." && docker network create $(SHARED_NETWORK))

# ------------------------------------------
#  Supabase targets
# ------------------------------------------

setup-supabase: network ## Setup Supabase (idempotent — skips if already running)
	@if docker ps --format '{{.Names}}' | grep -q "supabase-kong"; then \
		echo "  ✅ Supabase is already running. Skipping setup."; \
	else \
		echo "  🔧 Supabase not detected. Running setup..."; \
		bash scripts/setup-supabase.sh; \
	fi

start-supabase: ## Start Supabase services
	cd $(SUPABASE_DIR) && docker compose up -d

stop-supabase: ## Stop Supabase services
	cd $(SUPABASE_DIR) && docker compose down

restart-supabase: stop-supabase start-supabase ## Restart Supabase services

migrate: ## Run database migrations against self-hosted Supabase
	@MIGRATIONS_DIR="supabase/migrations"; \
	SUPABASE_DIR="$(SUPABASE_DIR)"; \
	if [ ! -d "$$MIGRATIONS_DIR" ]; then \
		echo "  ⚠️  No migrations directory found. Skipping."; \
		exit 0; \
	fi; \
	PG_PASS=$$(grep '^POSTGRES_PASSWORD=' "$$SUPABASE_DIR/.env" | cut -d'=' -f2- | tr -d '\r'); \
	if [ -z "$$PG_PASS" ]; then \
		echo "  ⚠️  Cannot read POSTGRES_PASSWORD. Skipping migrations."; \
		exit 0; \
	fi; \
	DB_CONTAINER=$$(cd "$$SUPABASE_DIR" && docker compose ps -q db 2>/dev/null); \
	if [ -z "$$DB_CONTAINER" ]; then \
		echo "  ⚠️  Supabase DB container not found. Skipping migrations."; \
		exit 0; \
	fi; \
	echo "  🗄️  Running database migrations..."; \
	FAILED=0; \
	for sql_file in $$(ls $$MIGRATIONS_DIR/*.sql 2>/dev/null | sort); do \
		fname=$$(basename "$$sql_file"); \
		echo "    ▸ $$fname"; \
		docker cp "$$sql_file" "$$DB_CONTAINER:/tmp/migration.sql"; \
		docker exec "$$DB_CONTAINER" psql -U postgres -d postgres -f /tmp/migration.sql > /dev/null 2>&1 || FAILED=$$((FAILED + 1)); \
		docker exec "$$DB_CONTAINER" rm -f /tmp/migration.sql; \
	done; \
	echo "  ✅ Migrations complete! ($$FAILED warnings)"; \
	echo "  🪣 Creating storage buckets..."; \
	docker exec "$$DB_CONTAINER" psql -U postgres -d postgres -c "\
		INSERT INTO storage.buckets (id, name, public) VALUES ('profile-avatars', 'profile-avatars', true) ON CONFLICT (id) DO NOTHING; \
		INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', false) ON CONFLICT (id) DO NOTHING; \
		INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', false) ON CONFLICT (id) DO NOTHING; \
	" 2>/dev/null || true; \
	echo "  ✅ Storage buckets ready."

# ------------------------------------------
#  App targets
# ------------------------------------------

build: ## Build the Setu Chat App image
	$(COMPOSE_PROD) build

start-app: ## Start App + Traefik (production)
	$(COMPOSE_PROD) up -d
	@echo "  ✅ App and Traefik started."

stop-app: ## Stop App + Traefik
	$(COMPOSE_PROD) down

restart-app: stop-app start-app ## Restart App + Traefik

# ==========================================
#  📋  MONITORING
# ==========================================

status: ## Show status of ALL services (App + Supabase)
	@echo ""
	@echo "  === Setu Chat App ==="
	@$(COMPOSE_PROD) ps 2>/dev/null || echo "  (not running)"
	@echo ""
	@echo "  === Supabase ==="
	@cd $(SUPABASE_DIR) && docker compose ps 2>/dev/null || echo "  (not running)"
	@echo ""

logs: ## Tail logs for App + Traefik
	$(COMPOSE_PROD) logs -f

logs-app: ## Tail logs for App only
	$(COMPOSE_PROD) logs -f setu-app

logs-traefik: ## Tail logs for Traefik only
	$(COMPOSE_PROD) logs -f traefik

logs-supabase: ## Tail logs for Supabase services
	cd $(SUPABASE_DIR) && docker compose logs -f

# ==========================================
#  🧹  CLEANUP
# ==========================================

down: stop-app ## Stop App + Traefik (keeps Supabase running)
	@echo "  ✅ App stopped. Supabase is still running."
	@echo "  To stop everything: make down-all"

down-all: stop-app stop-supabase ## Stop ALL services (App + Supabase)
	@echo "  ✅ All services stopped."

clean: ## Remove all containers, images, and volumes (⚠️  DESTRUCTIVE)
	@echo "⚠️  This will remove ALL containers, images, and volumes!"
	@read -p "Are you sure? (y/N) " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		$(COMPOSE_PROD) down -v --rmi all 2>/dev/null || true; \
		cd $(SUPABASE_DIR) && docker compose down -v --rmi all 2>/dev/null || true; \
		docker network rm $(SHARED_NETWORK) 2>/dev/null || true; \
		echo "  ✅ Cleaned up."; \
	else \
		echo "  ❌ Cancelled."; \
	fi
