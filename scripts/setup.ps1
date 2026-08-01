# storyteller — Windows setup script
# Run: powershell -ExecutionPolicy Bypass -File scripts/setup.ps1

param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Stop"

function info  { Write-Host "  $( '➜' -f Cyan ) $args" }
function ok    { Write-Host "  $( '✓' -f Green ) $args" }
function warn  { Write-Host "  $( '⚠' -f Yellow ) $args" }
function error { Write-Host "  $( '✗' -f Red ) $args" }

Write-Host ""
  Write-Host "  storyteller — project setup  " -f Cyan -b Black
Write-Host ""

# ── Prerequisites ──────────────────────────────────────────
info "Checking prerequisites..."

try { $bunVer = bun --version } catch { throw "bun is required (https://bun.sh)" }
ok "bun $bunVer"

try { $gitVer = (git --version) -replace 'git version ', '' } catch { throw "git is required" }
ok "git $gitVer"

if (-not $SkipDocker) {
  try {
    $dockerVer = (docker --version) -replace 'Docker version ', '' -replace ',.*', ''
    ok "docker $dockerVer"
    try { docker compose version | Out-Null } catch { throw "docker compose plugin is required" }
    ok "docker compose available"
    $hasDocker = $true
  } catch {
    warn "docker not found — skipping containerized services"
    $hasDocker = $false
  }
} else {
  $hasDocker = $false
}

# ── Environment files ──────────────────────────────────────
info "Setting up environment files..."

@(".env", "apps/api/.env", "apps/web/.env") | ForEach-Object {
  $envFile = $_
  $example = "$_.example"
  if (-not (Test-Path $envFile) -and (Test-Path $example)) {
    Copy-Item $example $envFile
    ok "Created $envFile from $example"
  } elseif (Test-Path $envFile) {
    ok "$envFile already exists"
  } else {
    warn "No $example found, skipping $envFile"
  }
}

# ── Install dependencies ───────────────────────────────────
info "Installing dependencies..."
bun install --frozen-lockfile
ok "Dependencies installed"

# ── Docker services ─────────────────────────────────────────
if ($hasDocker) {
  info "Starting Docker services..."
  docker compose up -d postgres mailpit
  ok "Docker services started (postgres, mailpit)"

  info "Waiting for PostgreSQL to be ready..."
  do {
    Start-Sleep 1
    $ready = docker compose exec -T postgres pg_isready -U template 2>$null
  } until ($LASTEXITCODE -eq 0)
  ok "PostgreSQL is ready"
} else {
  warn "Skipping Docker — ensure PostgreSQL and Mailpit are running"
  Write-Host "    Required: postgres:5432 | mailpit:1025"
}

# ── Database migrations ─────────────────────────────────────
info "Running database migrations..."
bun --cwd packages/db run migrate
ok "Migrations complete"

# ── Done ────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Setup complete!  " -f Green -b Black
Write-Host ""
Write-Host "  Start dev servers:" -f Cyan
Write-Host "    bun run dev"
Write-Host ""
Write-Host "  Start with Docker:" -f Cyan
Write-Host "    docker compose up -d"
Write-Host ""
Write-Host "  URLs:" -f Cyan
Write-Host "    API:        http://localhost:3001"
Write-Host "    Web:        http://localhost:5173"
Write-Host "    Mailpit:    http://localhost:8025"
Write-Host ""
