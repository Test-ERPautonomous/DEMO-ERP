#!/usr/bin/env bash
# ==============================================================================
# Najm Al Huda Workshop ERP - Universal Automated Deployment Script
# Use this script in Hostinger hPanel "Git" deployment settings:
# Command: bash deploy.sh
# ==============================================================================

set -e

echo ""
echo "🚀 [Hostinger Deploy] Starting automated deployment for Najm Al Huda Workshop ERP..."
echo "⏰ Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo "📂 Current Directory: $(pwd)"

# 1. Check Node.js version
if command -v node &> /dev/null; then
  NODE_VER=$(node -v)
  echo "🟢 Node.js Version: $NODE_VER"
else
  echo "❌ Node.js is not found in PATH. Please verify your Hostinger Node.js setup."
  exit 1
fi

# 2. Set Production Environment
export NODE_ENV=production

# 3. Install Dependencies (Include devDependencies needed for Vite & esbuild bundling)
echo ""
echo "📦 [Step 1/5] Installing dependencies..."
if [ -f "package-lock.json" ]; then
  npm ci --include=dev || npm install --include=dev
else
  npm install --include=dev
fi

# 4. Build Production Bundle (Vite React Frontend + Express Backend)
echo ""
echo "🛠️  [Step 2/5] Building frontend assets and backend server bundle..."
npm run build

# 5. Verify Build Output
echo ""
echo "🔍 [Step 3/5] Verifying build output..."
if [ ! -f "dist/index.html" ]; then
  echo "❌ Build verification failed: dist/index.html is missing."
  exit 1
fi
echo "✅ Build verified: Production bundle is ready in dist/."

# 6. Ensure persistent SQLite data directory exists
echo ""
echo "💾 [Step 4/5] Preparing persistent SQLite database directory..."
mkdir -p data
chmod 755 data
if [ ! -f "data/.gitkeep" ]; then
  touch data/.gitkeep
fi

# 7. Restart Application
echo ""
echo "🔄 [Step 5/5] Restarting application processes..."

# Passenger / LiteSpeed restart mechanism on Hostinger
mkdir -p tmp
touch tmp/restart.txt
echo "✅ Touched tmp/restart.txt (Passenger / LiteSpeed signal)"

# PM2 restart mechanism (if using PM2 on VPS or Cloud)
if command -v pm2 &> /dev/null; then
  echo "⚡ Reloading PM2 process..."
  pm2 reload ecosystem.config.cjs --update-env || pm2 start ecosystem.config.cjs || true
fi

echo ""
echo "🎉 [Hostinger Deploy] Deployment completed successfully!"
echo "🌐 Your ERP is up to date and running."
echo ""
