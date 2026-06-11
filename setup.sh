#!/bin/bash
# ─────────────────────────────────────────────────────────────
# setup.sh — Xeno CRM Folder Reorganization Script (Unix/macOS/Linux)
# Run command: bash setup.sh
# ─────────────────────────────────────────────────────────────

set -e  # Exit script immediately if a command exits with a non-zero status

echo "🚀 Reorganizing Xeno CRM Project Structure..."

# 1. Create Target Directory Tree
echo "📁 Creating directory structure..."
mkdir -p backend/src/routes
mkdir -p backend/src/services
mkdir -p backend/src/channel-service
mkdir -p frontend/src/components/Chat
mkdir -p frontend/src/components/Segment
mkdir -p frontend/src/components/Messages
mkdir -p frontend/src/components/Dashboard
mkdir -p frontend/src/hooks
mkdir -p frontend/src/api
mkdir -p frontend/src/utils

# 2. Relocate Backend Source Code (idempotent checks)
if [ -d "src" ]; then
  echo "📦 Moving root 'src' directory to 'backend/src'..."
  if [ -d "backend/src" ]; then
    # Merge contents if backend/src already exists
    cp -r src/* backend/src/
    rm -rf src
  else
    mv src backend/src
  fi
fi

# 3. Relocate Configuration & Database Scripts
for file in schema.sql seed.js .env.example package.json .env; do
  if [ -f "$file" ]; then
    echo "📄 Moving root '$file' to 'backend/$file'..."
    mv "$file" backend/
  fi
done

# 4. Check/Create Fallback Configurations if Missing
if [ ! -f "backend/src/index.js" ]; then
  touch backend/src/index.js
  echo "🆕 Created index.js template in backend/src/"
fi

if [ ! -f "backend/package.json" ]; then
  # Write a basic package.json fallback if missing
  cat <<EOT > backend/package.json
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
EOT
  echo "🆕 Created basic package.json template in backend/"
fi

if [ ! -f "backend/.env.example" ]; then
  cat <<EOT > backend/.env.example
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
GEMINI_API_KEY=your-api-key-here
PORT=3000
EOT
  echo "🆕 Created default .env.example template in backend/"
fi

# 5. Organise Frontend Flat Component Structure (if any)
echo "🧹 Reorganizing frontend flat components if present..."
if [ -d "frontend/src/components" ]; then
  cd frontend/src/components
  [ -f "ChatBubbles.jsx" ] && mv ChatBubbles.jsx Chat/ 2>/dev/null || true
  [ -f "ChatInput.jsx" ] && mv ChatInput.jsx Chat/ 2>/dev/null || true
  [ -f "SegmentPreview.jsx" ] && mv SegmentPreview.jsx Segment/ 2>/dev/null || true
  [ -f "MessageVariants.jsx" ] && mv MessageVariants.jsx Messages/ 2>/dev/null || true
  [ -f "MessageVariantCard.jsx" ] && mv MessageVariantCard.jsx Messages/ 2>/dev/null || true
  [ -f "CampaignDashboard.jsx" ] && mv CampaignDashboard.jsx Dashboard/ 2>/dev/null || true
  [ -f "StatCard.jsx" ] && mv StatCard.jsx Dashboard/ 2>/dev/null || true
  [ -f "CampaignInfo.jsx" ] && mv CampaignInfo.jsx Dashboard/ 2>/dev/null || true
  [ -f "EngagementTimeline.jsx" ] && mv EngagementTimeline.jsx Dashboard/ 2>/dev/null || true
  [ -f "CampaignStats.jsx" ] && mv CampaignStats.jsx Dashboard/ 2>/dev/null || true
  cd - >/dev/null 2>&1
fi

echo ""
echo "✅ Folder structure reorganized!"
echo "📁 Backend service: ./backend/"
echo "📁 Frontend client: ./frontend/"
echo ""
echo "🚀 Reorganization completed successfully!"
