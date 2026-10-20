// ==============================================================================
// Najm Al Huda Workshop ERP - Universal CommonJS Production Server Entry Point
// Fully compatible with Hostinger Node.js Application Manager, OpenLiteSpeed & PM2
// ==============================================================================

const path = require('path');
const fs = require('fs');

// Ensure .env is loaded before candidate modules are evaluated
try {
  const dotenv = require('dotenv');
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  } else {
    dotenv.config({ override: true });
  }
} catch (e) {
  // ignore
}

// Ensure data directory exists for local backups and exports
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (err) {
    console.warn('[CJS Entry] Notice creating data directory:', err.message);
  }
}

// Locate pre-compiled bundle in dist/
const candidates = [
  path.join(__dirname, 'dist', 'server.cjs'),
  path.join(__dirname, 'dist', 'server.js'),
  path.join(__dirname, 'dist-server', 'server.cjs')
];

let appModule;
let loaded = false;

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    try {
      appModule = require(candidate);
      loaded = true;
      break;
    } catch (err) {
      console.warn('[CJS Entry] Notice while loading ' + candidate + ':', err.message);
    }
  }
}

if (!loaded) {
  console.log('[CJS Entry] Compiled dist/server.cjs not found. Triggering inline build...');
  try {
    const { execSync } = require('child_process');
    execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs', {
      stdio: 'inherit',
      cwd: __dirname
    });
    const cjsPath = path.join(__dirname, 'dist', 'server.cjs');
    if (fs.existsSync(cjsPath)) {
      appModule = require(cjsPath);
      loaded = true;
    }
  } catch (err) {
    console.error('[CJS Entry] Failed to compile server bundle:', err.message);
  }
}

const resolvedApp = (appModule && (appModule.default || appModule.app || appModule)) || {};
module.exports = resolvedApp;
module.exports.app = resolvedApp;
module.exports.default = resolvedApp;
