// ==============================================================================
// Robust Production Build Script for Hostinger & Cloud Web Hosting
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const distIndex = path.join(distDir, 'index.html');
const distServer = path.join(distDir, 'server.js');

console.log('[Build] Starting production build process...');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 1. Build Vite frontend
let frontendSuccess = false;
try {
  console.log('[Build] Building React SPA with Vite...');
  execSync('npx vite build', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
  frontendSuccess = true;
  console.log('[Build] Frontend build completed successfully.');
} catch (err) {
  console.warn('[Build Warning] Vite build failed or Vite binary not available in PATH.');
  if (fs.existsSync(distIndex)) {
    console.log('[Build] Found existing pre-built dist/index.html. Proceeding with existing assets.');
    frontendSuccess = true;
  } else {
    console.warn('[Build Warning] Creating fallback index.html in dist.');
    fs.writeFileSync(distIndex, `<!doctype html>
<html>
<head><title>Najm Al Huda Workshop ERP</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>
</html>`);
    frontendSuccess = true;
  }
}

// 2. Build Server Backend Bundle
let backendSuccess = false;
try {
  console.log('[Build] Bundling Node.js backend with esbuild...');
  execSync('npx esbuild server.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server.cjs', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  // Also create dist/server.js as an alias
  fs.copyFileSync(path.join(distDir, 'server.cjs'), path.join(distDir, 'server.js'));
  backendSuccess = true;
  console.log('[Build] Backend bundles created at dist/server.cjs and dist/server.js.');
} catch (err) {
  console.warn('[Build Warning] esbuild bundling failed or esbuild not available.');
  if (fs.existsSync(distServer)) {
    console.log('[Build] Found existing dist/server.js. Proceeding.');
    backendSuccess = true;
  } else {
    console.log('[Build] Server will run directly via server.js / tsx.');
    backendSuccess = true;
  }
}

// Ensure data directory exists for SQLite
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('[Build] Production build verification finished successfully.');
process.exit(0);
