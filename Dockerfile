# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ============================================
# Stage 2: Build the application
# ============================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects anonymous telemetry data — disable it
ENV NEXT_TELEMETRY_DISABLED=1

# These NEXT_PUBLIC_* vars are needed at BUILD time because Next.js
# inlines them into the client bundle. Server-only vars (SUPABASE_SERVICE_ROLE_KEY,
# SMTP_*, etc.) are provided at runtime via docker-compose env_file.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_MAX_CHAT_FILE_SIZE_MB=5

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_MAX_CHAT_FILE_SIZE_MB=$NEXT_PUBLIC_MAX_CHAT_FILE_SIZE_MB

RUN npm run build

# ============================================
# Stage 3: Production runner (standalone)
# ============================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets (if they exist)
# Using a wildcard so the COPY doesn't fail when /public is absent
COPY --from=builder /app/public* ./public/

# Leverage Next.js standalone output for minimal image size
# The standalone output bundles only the necessary node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Standalone output creates a server.js at the root
CMD ["node", "server.js"]
