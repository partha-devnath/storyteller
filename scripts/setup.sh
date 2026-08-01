#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}➜${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
fail()  { error "$1"; exit 1; }

echo ""
echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   storyteller — project setup   ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
echo ""

# ── Prerequisites ──────────────────────────────────────────
info "Checking prerequisites..."

command -v bun  >/dev/null 2>&1 || fail "bun is required (https://bun.sh)"
ok "bun $(bun --version)"

command -v git >/dev/null 2>&1 || fail "git is required"
ok "git $(git --version 2>/dev/null | cut -d' ' -f3)"

if ! command -v docker >/dev/null 2>&1; then
  warn "docker not found — skipping containerized services"
  HAS_DOCKER=false
else
  ok "docker $(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')"
  if docker compose version >/dev/null 2>&1; then
    ok "docker compose available"
  else
    fail "docker compose plugin is required"
  fi
  HAS_DOCKER=true
fi

# ── Environment files ──────────────────────────────────────
info "Setting up environment files..."

for env_file in .env apps/api/.env apps/web/.env; do
  example="${env_file}.example"
  if [ ! -f "$env_file" ] && [ -f "$example" ]; then
    cp "$example" "$env_file"
    ok "Created $env_file from $example"
  elif [ -f "$env_file" ]; then
    ok "$env_file already exists"
  else
    warn "No $example found, skipping $env_file"
  fi
done

# ── Install dependencies ───────────────────────────────────
info "Installing dependencies..."
bun install --frozen-lockfile
ok "Dependencies installed"

# ── Docker services ─────────────────────────────────────────
if [ "$HAS_DOCKER" = true ]; then
  info "Starting Docker services..."
  docker compose up -d postgres mailpit
  ok "Docker services started (postgres, mailpit)"
  echo ""
  info "Waiting for PostgreSQL to be ready..."
  until docker compose exec -T postgres pg_isready -U template >/dev/null 2>&1; do
    sleep 1
  done
  ok "PostgreSQL is ready"
else
  warn "Skipping Docker — ensure PostgreSQL and Mailpit are running"
  echo "  Required: postgres:5432 | mailpit:1025"
fi

# ── Database migrations ─────────────────────────────────────
info "Running database migrations..."
bun --cwd packages/db run migrate
ok "Migrations complete"

# ── Done ────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Setup complete!               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}Start dev servers:${NC}"
echo "    bun run dev"
echo ""
echo -e "  ${CYAN}Start with Docker:${NC}"
echo "    docker compose up -d"
echo ""
echo -e "  ${CYAN}URLs:${NC}"
echo "    API:        http://localhost:3001"
echo "    Web:        http://localhost:5173"
echo "    Mailpit:    http://localhost:8025"
echo ""
