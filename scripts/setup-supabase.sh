#!/usr/bin/env bash
# ============================================
# Idempotent Supabase Self-Hosting Setup Script
# ============================================
# This script:
#   1. Clones the official Supabase repo (if not already done)
#   2. Copies Docker files into a supabase-project directory
#   3. Generates secure secrets (passwords, JWT keys, etc.)
#   4. Configures URLs for your domain
#   5. Creates the shared Docker network
#   6. Starts all Supabase services
#
# It is safe to run multiple times — it skips steps already completed.
# ============================================

set -euo pipefail

# ------------------------------------------
# Configuration
# ------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SUPABASE_DIR="${PROJECT_ROOT}/../supabase-project"
SUPABASE_REPO_DIR="${PROJECT_ROOT}/../supabase-repo"
SHARED_NETWORK="setu-network"

# Domain configuration
SUPABASE_DOMAIN="${SUPABASE_DOMAIN:-supabase.chat.theabhipatel.com}"
APP_DOMAIN="${APP_DOMAIN:-chat.theabhipatel.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ------------------------------------------
# Step 0: Check prerequisites
# ------------------------------------------
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v docker &>/dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker compose version &>/dev/null; then
        log_error "Docker Compose V2 is not available. Please install it."
        exit 1
    fi

    if ! command -v git &>/dev/null; then
        log_error "Git is not installed. Please install Git first."
        exit 1
    fi

    if ! command -v openssl &>/dev/null; then
        log_error "OpenSSL is not installed. Please install OpenSSL first."
        exit 1
    fi

    log_ok "All prerequisites met."
}

# ------------------------------------------
# Step 1: Clone Supabase repository
# ------------------------------------------
clone_supabase_repo() {
    if [ -d "$SUPABASE_REPO_DIR" ]; then
        log_ok "Supabase repo already cloned at $SUPABASE_REPO_DIR"
        return 0
    fi

    log_info "Cloning Supabase repository..."
    git clone --depth 1 https://github.com/supabase/supabase "$SUPABASE_REPO_DIR"
    log_ok "Supabase repo cloned."
}

# ------------------------------------------
# Step 2: Copy Docker files to project
# ------------------------------------------
setup_supabase_project() {
    if [ -f "$SUPABASE_DIR/docker-compose.yml" ]; then
        log_ok "Supabase project already exists at $SUPABASE_DIR"
        return 0
    fi

    log_info "Setting up Supabase project directory..."
    mkdir -p "$SUPABASE_DIR"
    cp -rf "$SUPABASE_REPO_DIR/docker/"* "$SUPABASE_DIR/"
    cp "$SUPABASE_REPO_DIR/docker/.env.example" "$SUPABASE_DIR/.env"
    log_ok "Supabase project created at $SUPABASE_DIR"
}

# ------------------------------------------
# Step 3: Generate secure secrets
# ------------------------------------------
generate_secrets() {
    local env_file="$SUPABASE_DIR/.env"

    # Check if secrets were already generated (we use POSTGRES_PASSWORD as indicator)
    local current_pg_pass
    current_pg_pass=$(grep -E '^POSTGRES_PASSWORD=' "$env_file" | cut -d'=' -f2-)
    if [ "$current_pg_pass" != "your-super-secret-and-long-postgres-password" ]; then
        log_ok "Secrets already generated (POSTGRES_PASSWORD is not default)."
        return 0
    fi

    log_info "Generating secure secrets..."

    # Generate random values
    local pg_password
    pg_password=$(openssl rand -hex 32)
    local jwt_secret
    jwt_secret=$(openssl rand -base64 48 | tr -d '\n' | head -c 64)
    local secret_key_base
    secret_key_base=$(openssl rand -base64 48 | tr -d '\n')
    local vault_enc_key
    vault_enc_key=$(openssl rand -hex 16)
    local pg_meta_crypto_key
    pg_meta_crypto_key=$(openssl rand -base64 24 | tr -d '\n')
    local logflare_public_token
    logflare_public_token=$(openssl rand -base64 24 | tr -d '\n')
    local logflare_private_token
    logflare_private_token=$(openssl rand -base64 24 | tr -d '\n')
    local s3_access_key_id
    s3_access_key_id=$(openssl rand -hex 16)
    local s3_access_key_secret
    s3_access_key_secret=$(openssl rand -hex 32)
    local dashboard_password
    dashboard_password=$(openssl rand -base64 16 | tr -d '\n' | tr -dc 'a-zA-Z0-9' | head -c 20)

    # Generate JWT tokens using Dockerized Node.js (ANON_KEY and SERVICE_ROLE_KEY)
    local anon_key
    anon_key=$(docker run --rm node:20-alpine node -e "
const crypto = require('crypto');
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const now = Math.floor(Date.now()/1000);
const payload = Buffer.from(JSON.stringify({role:'anon',iss:'supabase',iat:now,exp:now+157680000})).toString('base64url');
const sig = crypto.createHmac('sha256','${jwt_secret}').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")

    local service_role_key
    service_role_key=$(docker run --rm node:20-alpine node -e "
const crypto = require('crypto');
const header = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
const now = Math.floor(Date.now()/1000);
const payload = Buffer.from(JSON.stringify({role:'service_role',iss:'supabase',iat:now,exp:now+157680000})).toString('base64url');
const sig = crypto.createHmac('sha256','${jwt_secret}').update(header+'.'+payload).digest('base64url');
console.log(header+'.'+payload+'.'+sig);
")

    # Replace values in .env file
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${pg_password}|" "$env_file"
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${jwt_secret}|" "$env_file"
    sed -i "s|^ANON_KEY=.*|ANON_KEY=${anon_key}|" "$env_file"
    sed -i "s|^SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=${service_role_key}|" "$env_file"
    sed -i "s|^SECRET_KEY_BASE=.*|SECRET_KEY_BASE=${secret_key_base}|" "$env_file"
    sed -i "s|^VAULT_ENC_KEY=.*|VAULT_ENC_KEY=${vault_enc_key}|" "$env_file"
    sed -i "s|^PG_META_CRYPTO_KEY=.*|PG_META_CRYPTO_KEY=${pg_meta_crypto_key}|" "$env_file"
    sed -i "s|^LOGFLARE_PUBLIC_ACCESS_TOKEN=.*|LOGFLARE_PUBLIC_ACCESS_TOKEN=${logflare_public_token}|" "$env_file"
    sed -i "s|^LOGFLARE_PRIVATE_ACCESS_TOKEN=.*|LOGFLARE_PRIVATE_ACCESS_TOKEN=${logflare_private_token}|" "$env_file"
    sed -i "s|^S3_PROTOCOL_ACCESS_KEY_ID=.*|S3_PROTOCOL_ACCESS_KEY_ID=${s3_access_key_id}|" "$env_file"
    sed -i "s|^S3_PROTOCOL_ACCESS_KEY_SECRET=.*|S3_PROTOCOL_ACCESS_KEY_SECRET=${s3_access_key_secret}|" "$env_file"
    sed -i "s|^DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=${dashboard_password}|" "$env_file"

    # Save credentials to a file for reference
    cat > "$SUPABASE_DIR/.credentials" <<EOF
# ============================================
# Supabase Credentials (AUTO-GENERATED)
# Keep this file safe! Do NOT commit to git.
# Generated on: $(date)
# ============================================

SUPABASE_URL=https://${SUPABASE_DOMAIN}
ANON_KEY=${anon_key}
SERVICE_ROLE_KEY=${service_role_key}
POSTGRES_PASSWORD=${pg_password}
DASHBOARD_USERNAME=supabase
DASHBOARD_PASSWORD=${dashboard_password}

# Use these in your app's .env file:
# NEXT_PUBLIC_SUPABASE_URL=https://${SUPABASE_DOMAIN}
# NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon_key}
# SUPABASE_SERVICE_ROLE_KEY=${service_role_key}
EOF
    chmod 600 "$SUPABASE_DIR/.credentials"

    log_ok "Secrets generated and saved to $SUPABASE_DIR/.credentials"
}

# ------------------------------------------
# Step 4: Configure URLs
# ------------------------------------------
configure_urls() {
    local env_file="$SUPABASE_DIR/.env"

    log_info "Configuring Supabase URLs for domain: $SUPABASE_DOMAIN"

    sed -i "s|^SUPABASE_PUBLIC_URL=.*|SUPABASE_PUBLIC_URL=https://${SUPABASE_DOMAIN}|" "$env_file"
    sed -i "s|^API_EXTERNAL_URL=.*|API_EXTERNAL_URL=https://${SUPABASE_DOMAIN}|" "$env_file"
    sed -i "s|^SITE_URL=.*|SITE_URL=https://${APP_DOMAIN}|" "$env_file"

    # Set the Pooler tenant ID
    sed -i "s|^POOLER_TENANT_ID=.*|POOLER_TENANT_ID=setu-chat|" "$env_file"

    log_ok "URLs configured."
}

# ------------------------------------------
# Step 5: Create shared Docker network
# ------------------------------------------
create_shared_network() {
    if docker network inspect "$SHARED_NETWORK" &>/dev/null; then
        log_ok "Docker network '$SHARED_NETWORK' already exists."
        return 0
    fi

    log_info "Creating shared Docker network: $SHARED_NETWORK"
    docker network create "$SHARED_NETWORK"
    log_ok "Network '$SHARED_NETWORK' created."
}

# ------------------------------------------
# Step 6: Create override file
# Connects Kong to shared network + Traefik labels
# + Injects Google OAuth into the auth container
# Always regenerated to pick up config changes.
# ------------------------------------------
create_override_file() {
    local override_file="$SUPABASE_DIR/docker-compose.override.yml"
    local app_env_prod="$PROJECT_ROOT/.env.prod"
    local app_env="$PROJECT_ROOT/.env"

    log_info "Generating Supabase compose override..."

    # --- Detect Google OAuth credentials from app env ---
    local google_client_id=""
    local google_secret=""

    if [ -f "$app_env_prod" ]; then
        google_client_id=$(grep -E '^CLIENT_ID=' "$app_env_prod" | cut -d'=' -f2- | tail -n 1 | tr -d '\r')
        google_secret=$(grep -E '^CLIENT_SECRET=' "$app_env_prod" | cut -d'=' -f2- | tail -n 1 | tr -d '\r')
    fi

    if [ -z "$google_client_id" ] && [ -f "$app_env" ]; then
        google_client_id=$(grep -E '^CLIENT_ID=' "$app_env" | cut -d'=' -f2- | tail -n 1 | tr -d '\r')
        google_secret=$(grep -E '^CLIENT_SECRET=' "$app_env" | cut -d'=' -f2- | tail -n 1 | tr -d '\r')
    fi

    # --- Build the auth override section ---
    local auth_section=""
    if [ -n "$google_client_id" ] && [ -n "$google_secret" ]; then
        log_info "Found Google OAuth credentials. Enabling Google Auth in Supabase..."
        auth_section="
  auth:
    environment:
      GOTRUE_SITE_URL: https://${APP_DOMAIN}
      GOTRUE_URI_ALLOW_LIST: https://${APP_DOMAIN},https://${APP_DOMAIN}/**
      GOTRUE_EXTERNAL_GOOGLE_ENABLED: \"true\"
      GOTRUE_EXTERNAL_GOOGLE_CLIENT_ID: ${google_client_id}
      GOTRUE_EXTERNAL_GOOGLE_SECRET: ${google_secret}
      GOTRUE_EXTERNAL_GOOGLE_REDIRECT_URI: https://${SUPABASE_DOMAIN}/auth/v1/callback"
    else
        log_warn "No Google OAuth credentials found (CLIENT_ID/CLIENT_SECRET). Skipping auth provider setup."
        auth_section="
  auth:
    environment:
      GOTRUE_SITE_URL: https://${APP_DOMAIN}
      GOTRUE_URI_ALLOW_LIST: https://${APP_DOMAIN},https://${APP_DOMAIN}/**"
    fi

    # --- Write the override file ---
    cat > "$override_file" <<OVERRIDE
# ============================================
# Override: Shared network + Traefik + Auth
# Auto-generated by setup-supabase.sh
# ============================================

services:
  kong:
    networks:
      default:
        aliases:
          - api-gw
      setu-network: {}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.supabase.rule=Host(\`${SUPABASE_DOMAIN}\`)"
      - "traefik.http.routers.supabase.entrypoints=websecure"
      - "traefik.http.routers.supabase.tls.certresolver=letsencrypt"
      - "traefik.http.services.supabase.loadbalancer.server.port=8000"
      - "traefik.docker.network=setu-network"
${auth_section}

networks:
  setu-network:
    external: true
OVERRIDE

    log_ok "Override file created at $override_file"

    # Ensure COMPOSE_FILE in Supabase .env includes the override.
    # Supabase sets COMPOSE_FILE=docker-compose.yml which disables
    # auto-loading of docker-compose.override.yml.
    local env_file="$SUPABASE_DIR/.env"
    if grep -q '^COMPOSE_FILE=' "$env_file" 2>/dev/null; then
        if ! grep -q 'docker-compose.override.yml' "$env_file"; then
            sed -i 's|^COMPOSE_FILE=docker-compose.yml|COMPOSE_FILE=docker-compose.yml:docker-compose.override.yml|' "$env_file"
            log_ok "Patched COMPOSE_FILE in .env to include override."
        fi
    fi
}

# ------------------------------------------
# Step 7: Repair corrupted compose (if needed)
# ------------------------------------------
repair_compose_if_needed() {
    local compose_file="$SUPABASE_DIR/docker-compose.yml"

    # Test if the compose file is valid
    if cd "$SUPABASE_DIR" && docker compose config --quiet 2>/dev/null; then
        log_ok "Supabase compose file is valid."
        return 0
    fi

    log_warn "Supabase compose file is corrupted. Restoring from repo..."

    # Re-copy the original compose file
    cp -f "$SUPABASE_REPO_DIR/docker/docker-compose.yml" "$compose_file"
    log_ok "Compose file restored."
}

# ------------------------------------------
# Step 8: Pull and start Supabase
# ------------------------------------------
start_supabase() {
    log_info "Pulling Supabase images (this may take a few minutes on first run)..."
    cd "$SUPABASE_DIR"
    docker compose pull

    log_info "Starting Supabase services..."
    docker compose up -d

    log_ok "Supabase services started!"
    log_info "Waiting for services to become healthy..."

    # Wait up to 120 seconds for services to be healthy
    local max_wait=120
    local elapsed=0
    while [ $elapsed -lt $max_wait ]; do
        local unhealthy
        unhealthy=$(docker compose ps --format json 2>/dev/null | grep -c '"unhealthy"\|"starting"' || true)
        if [ "$unhealthy" -eq 0 ]; then
            local running
            running=$(docker compose ps --format json 2>/dev/null | grep -c '"running"' || true)
            if [ "$running" -gt 0 ]; then
                log_ok "All Supabase services are healthy! ($running services running)"
                return 0
            fi
        fi
        sleep 5
        elapsed=$((elapsed + 5))
        echo -ne "  ⏳ Waiting... ${elapsed}s / ${max_wait}s\r"
    done

    log_warn "Some services may still be starting. Check with: docker compose -f $SUPABASE_DIR/docker-compose.yml ps"
}

# ------------------------------------------
# Step 8a: Stop unused Supabase services
# Saves ~30% CPU and ~727MB RAM
# ------------------------------------------
stop_unused_services() {
    cd "$SUPABASE_DIR"

    log_info "Stopping unused Supabase services to save resources..."

    # These services are NOT needed by the app:
    # analytics (Logflare) - 27% CPU, 568MB RAM
    # vector              - log shipping for analytics
    # imgproxy            - image transformations (not used)
    # edge-functions      - Deno Edge Functions (not used)
    # NOTE: meta (pg-meta) is kept running — Studio Table Editor needs it.
    local unused_services="analytics vector imgproxy edge-functions"

    for svc in $unused_services; do
        if docker compose ps -q "$svc" 2>/dev/null | grep -q .; then
            docker compose stop "$svc" 2>/dev/null
            log_ok "  Stopped: $svc"
        fi
    done

    log_ok "Unused services stopped. Saved ~30% CPU + ~727MB RAM."
}

# ------------------------------------------
# Step 8b: Run database migrations
# Executes all SQL files from supabase/migrations/
# Only runs if tables don't exist yet (idempotent).
# ------------------------------------------
run_migrations() {
    local migrations_dir="$PROJECT_ROOT/supabase/migrations"

    if [ ! -d "$migrations_dir" ]; then
        log_warn "No migrations directory found at $migrations_dir. Skipping."
        return 0
    fi

    # Read postgres password from Supabase .env
    local pg_password
    pg_password=$(grep '^POSTGRES_PASSWORD=' "$SUPABASE_DIR/.env" | cut -d'=' -f2- | tr -d '\r')

    if [ -z "$pg_password" ]; then
        log_warn "Cannot read POSTGRES_PASSWORD from Supabase .env. Skipping migrations."
        return 0
    fi

    # Get the Supabase DB container name
    cd "$SUPABASE_DIR"
    local db_container
    db_container=$(docker compose ps -q db 2>/dev/null)

    if [ -z "$db_container" ]; then
        log_warn "Supabase DB container not found. Skipping migrations."
        return 0
    fi

    # Check if tables already exist (idempotent check)
    local table_exists
    table_exists=$(docker exec "$db_container" psql -U postgres -d postgres -tAc \
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles');" 2>/dev/null || echo "f")

    if [ "$table_exists" = "t" ]; then
        log_ok "Database tables already exist. Skipping migrations."
        return 0
    fi

    log_info "Running database migrations..."

    # Run each migration file in order
    local migration_count=0
    for sql_file in $(ls "$migrations_dir"/*.sql 2>/dev/null | sort); do
        local filename
        filename=$(basename "$sql_file")
        log_info "  Running: $filename"

        # Copy SQL file into container and execute
        docker cp "$sql_file" "$db_container:/tmp/migration.sql"
        local result
        result=$(docker exec "$db_container" psql -U postgres -d postgres -f /tmp/migration.sql 2>&1) || {
            log_warn "  ⚠ Migration $filename had errors (may be safe to ignore if re-running):"
            echo "    ${result}" | head -5
        }
        docker exec "$db_container" rm -f /tmp/migration.sql
        migration_count=$((migration_count + 1))
    done

    # Create storage buckets (these are commented out in migration files)
    log_info "Creating storage buckets..."
    docker exec "$db_container" psql -U postgres -d postgres -c "
        INSERT INTO storage.buckets (id, name, public) VALUES ('profile-avatars', 'profile-avatars', true) ON CONFLICT (id) DO NOTHING;
        INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', false) ON CONFLICT (id) DO NOTHING;
        INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', false) ON CONFLICT (id) DO NOTHING;
    " 2>/dev/null || log_warn "Storage buckets may already exist."

    # Create storage policies
    log_info "Setting up storage policies..."
    docker exec "$db_container" psql -U postgres -d postgres -c "
        CREATE POLICY \"Avatar public read\" ON storage.objects FOR SELECT USING (bucket_id = 'profile-avatars');
        CREATE POLICY \"Avatar auth upload\" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'profile-avatars' AND auth.uid() IS NOT NULL);
        CREATE POLICY \"Avatar owner update\" ON storage.objects FOR UPDATE USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
        CREATE POLICY \"Avatar owner delete\" ON storage.objects FOR DELETE USING (bucket_id = 'profile-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    " 2>/dev/null || log_warn "Storage policies may already exist."

    log_ok "Database migrations complete! ($migration_count files executed)"
}

# ------------------------------------------
# Step 9: Auto-configure app .env with self-hosted credentials
# ------------------------------------------
configure_app_env() {
    local app_env_file="$PROJECT_ROOT/.env"

    # Create .env from .env.example if it doesn't exist
    if [ ! -f "$app_env_file" ]; then
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$app_env_file"
            log_info "Created .env from .env.example"
        else
            touch "$app_env_file"
            log_info "Created empty .env file"
        fi
    fi

    # Read generated credentials from Supabase .env
    local supabase_env="$SUPABASE_DIR/.env"
    local anon_key
    anon_key=$(grep '^ANON_KEY=' "$supabase_env" | cut -d'=' -f2-)
    local service_role_key
    service_role_key=$(grep '^SERVICE_ROLE_KEY=' "$supabase_env" | cut -d'=' -f2-)
    local supabase_url="https://${SUPABASE_DOMAIN}"

    log_info "Configuring app .env with self-hosted Supabase credentials..."

    # Helper: update existing key or append
    update_env_var() {
        local key="$1" value="$2" file="$3"
        if grep -q "^${key}=" "$file"; then
            sed -i "s|^${key}=.*|${key}=${value}|" "$file"
        else
            echo "${key}=${value}" >> "$file"
        fi
    }

    update_env_var "NEXT_PUBLIC_SUPABASE_URL" "$supabase_url" "$app_env_file"
    update_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$anon_key" "$app_env_file"
    update_env_var "SUPABASE_SERVICE_ROLE_KEY" "$service_role_key" "$app_env_file"
    update_env_var "NEXT_PUBLIC_APP_URL" "https://${APP_DOMAIN}" "$app_env_file"

    # Self-hosted Supabase uses HS256 (symmetric) JWT signing. The app's
    # middleware needs this secret to verify access tokens locally, because
    # the JWKS endpoint returns empty keys in self-hosted mode.
    local jwt_secret
    jwt_secret=$(grep '^JWT_SECRET=' "$supabase_env" | cut -d'=' -f2-)
    if [ -n "$jwt_secret" ]; then
        update_env_var "SUPABASE_JWT_SECRET" "$jwt_secret" "$app_env_file"
        log_ok "JWT_SECRET copied for local token verification."
    fi

    log_ok "App .env updated → connected to self-hosted Supabase."
}

# ------------------------------------------
# Step 10: Print summary
# ------------------------------------------
print_summary() {
    local credentials_file="$SUPABASE_DIR/.credentials"

    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  ✅  Supabase Self-Hosted Setup Complete!  ${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo -e "  📂 Project directory:  ${BLUE}$SUPABASE_DIR${NC}"
    echo -e "  🔑 Credentials file:   ${BLUE}$credentials_file${NC}"
    echo ""
    echo -e "  🌐 Supabase URL:       ${BLUE}https://$SUPABASE_DOMAIN${NC}"
    echo -e "  📊 Dashboard:          ${BLUE}https://$SUPABASE_DOMAIN${NC}  (user: supabase)"
    echo -e "  🔗 App .env:           ${BLUE}Auto-configured ✅${NC}"
    echo ""
}

# ------------------------------------------
# Main execution
# ------------------------------------------
main() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  🚀  Supabase Self-Hosted Setup           ${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""

    check_prerequisites
    clone_supabase_repo
    setup_supabase_project
    generate_secrets
    configure_urls
    create_shared_network
    repair_compose_if_needed
    create_override_file
    start_supabase
    stop_unused_services
    run_migrations
    configure_app_env
    print_summary
}

main "$@"
