# ─────────────────────────────────────────────────────────────
# setup.ps1 — Xeno CRM Folder Reorganization Script (Windows PowerShell)
# Run command: powershell -ExecutionPolicy Bypass -File setup.ps1
# ─────────────────────────────────────────────────────────────

$ErrorActionPreference = "Stop"

Write-Host "🚀 Reorganizing Xeno CRM Project Structure..." -ForegroundColor Cyan

# 1. Create Target Directory Tree
Write-Host "📁 Creating directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "backend/src/routes" | Out-Null
New-Item -ItemType Directory -Force -Path "backend/src/services" | Out-Null
New-Item -ItemType Directory -Force -Path "backend/src/channel-service" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend/src/components/Chat" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend/src/components/Segment" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend/src/components/Messages" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend/src/components/Dashboard" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend/src/hooks" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend/src/api" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend/src/utils" | Out-Null

# 2. Relocate Backend Source Code (idempotent checks)
if (Test-Path "src") {
    Write-Host "📦 Moving root 'src' directory to 'backend/src'..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Force -Path "backend" | Out-Null
    if (Test-Path "backend/src") {
        # Copy elements from src/ to backend/src/ then delete the original
        Copy-Item -Path "src/*" -Destination "backend/src/" -Recurse -Force
        Remove-Item -Path "src" -Recurse -Force
    } else {
        Move-Item "src" "backend/src" -Force
    }
}

# 3. Relocate Configuration & Database Scripts
$backendFiles = @("schema.sql", "seed.js", ".env.example", "package.json", ".env")
foreach ($file in $backendFiles) {
    if (Test-Path $file) {
        Write-Host "📄 Moving root '$file' to 'backend/$file'..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Force -Path "backend" | Out-Null
        Move-Item $file "backend/" -Force
    }
}

# 4. Check/Create Fallback Configurations if Missing
if (-not (Test-Path "backend/src/index.js")) {
    New-Item -ItemType File -Force -Path "backend/src/index.js" | Out-Null
    Write-Host "🆕 Created index.js template in backend/src/" -ForegroundColor Blue
}

if (-not (Test-Path "backend/package.json")) {
    $packageJsonContent = @'
{
  "name": "xeno-mini-crm-backend",
  "version": "1.1.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "channel": "node src/channel-service/index.js",
    "seed": "node seed.js",
    "seed:fresh": "node seed.js --fresh"
  },
  "dependencies": {
    "@faker-js/faker": "^8.4.1",
    "@google/generative-ai": "^0.21.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "pg": "^8.12.0",
    "socket.io": "^4.7.5"
  }
}
'@
    Set-Content -Path "backend/package.json" -Value $packageJsonContent -Encoding UTF8
    Write-Host "🆕 Created basic package.json template in backend/" -ForegroundColor Blue
}

if (-not (Test-Path "backend/.env.example")) {
    $envExampleContent = @'
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
GEMINI_API_KEY=your-api-key-here
PORT=3000
'@
    Set-Content -Path "backend/.env.example" -Value $envExampleContent -Encoding UTF8
    Write-Host "🆕 Created default .env.example template in backend/" -ForegroundColor Blue
}

# 5. Organise Frontend Flat Component Structure (if any)
Write-Host "🧹 Reorganizing frontend flat components if present..." -ForegroundColor Yellow
if (Test-Path "frontend/src/components") {
    $compDir = "frontend/src/components"
    $moves = @(
        @("ChatBubbles.jsx", "Chat"),
        @("ChatInput.jsx", "Chat"),
        @("SegmentPreview.jsx", "Segment"),
        @("MessageVariants.jsx", "Messages"),
        @("MessageVariantCard.jsx", "Messages"),
        @("CampaignDashboard.jsx", "Dashboard"),
        @("StatCard.jsx", "Dashboard"),
        @("CampaignInfo.jsx", "Dashboard"),
        @("EngagementTimeline.jsx", "Dashboard"),
        @("CampaignStats.jsx", "Dashboard")
    )
    foreach ($move in $moves) {
        $file = Join-Path $compDir $move[0]
        $dest = Join-Path $compDir $move[1]
        if (Test-Path $file) {
            Move-Item $file $dest -Force -ErrorAction SilentlyContinue
            Write-Host "Moved $file to $dest" -ForegroundColor DarkYellow
        }
    }
}

Write-Host ""
Write-Host "✅ Folder structure reorganized!" -ForegroundColor Green
Write-Host "📁 Backend service: ./backend/" -ForegroundColor Cyan
Write-Host "📁 Frontend client: ./frontend/" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Reorganization completed successfully!" -ForegroundColor Green
