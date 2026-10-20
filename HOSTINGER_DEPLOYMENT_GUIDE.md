# 🚀 Deploying Najm Al Huda Workshop ERP on Hostinger from GitHub

This application is fully optimized for deployment on **Hostinger Web Hosting, Cloud Hosting, and Hostinger VPS** directly from your GitHub repository.

---

## 📋 Overview of Deployment Methods

| Method | Hostinger Plan | Setup Complexity | Best For |
| :--- | :--- | :--- | :--- |
| **Method 1: Hostinger hPanel Node.js + Git** | Business Web / Cloud Hosting | ⭐ Easy (5 mins) | Standard Hostinger hPanel users |
| **Method 2: GitHub Actions CI/CD** | Cloud Hosting / VPS / SSH | ⭐⭐ Medium | Automatic push-to-deploy on git push |
| **Method 3: Hostinger VPS with PM2** | KVM VPS (Ubuntu/Debian) | ⭐⭐ Medium | Full server control, high concurrency |

---

## 🛠️ Method 1: Hostinger hPanel (Node.js + Git) — Recommended

### Step 1: Connect your GitHub Repository to Hostinger
1. Log in to your **Hostinger hPanel** (`hpanel.hostinger.com`).
2. Navigate to **Websites** → Select your domain → Click **Dashboard / Manage**.
3. In the left sidebar, scroll down to **Advanced** → click **GIT**.
4. Configure your repository:
   - **Repository URL**: `https://github.com/Autonomous-riad/Najmalhuda.git`
   - **Branch**: `main` (or `master`)
   - **Install path**: Leave empty or set to `public_html` (or your subdomain folder, e.g. `erp`).
5. Click **Create**.
6. Under **Auto Deployment**, click **Enable Webhook**. Copy the Webhook URL and Secret and add it to your GitHub Repository (**Settings → Webhooks → Add webhook**) so Hostinger automatically pulls new commits whenever you push to GitHub!

### Step 2: Configure the Node.js Application Manager
1. In hPanel, go to **Advanced** → **Node.js** (or search "Node.js" in the top hPanel search bar).
2. Click **Create Application** (or Edit your existing one):
   - **Node.js version**: Select **`20.x`** or **`22.x`**.
   - **Application mode**: `Production`.
   - **Application root**: Select `public_html` (or the folder where git cloned the app).
   - **Application URL**: Select your domain or subdomain (e.g., `najmalhudagarage.com`).
   - **Application startup file**: Type `server.js`.
3. Under **Environment Variables**, add:
   - `NODE_ENV` = `production`
   - `PORT` = `3000`
   - `HOST` = `0.0.0.0`
   - `SUPABASE_URL` = `https://zigwijbljvsklepgbint.supabase.co`
   - `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZ3dpamJsanZza2xlcGdiaW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjE2OTMsImV4cCI6MjEwNzM5NzY5M30.FLeyoB1ljjzo4LXv9wro_AeVNfPKOB20n_mnbzmRLwc`
   - `VITE_SUPABASE_URL` = `https://zigwijbljvsklepgbint.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZ3dpamJsanZza2xlcGdiaW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjE2OTMsImV4cCI6MjEwNzM5NzY5M30.FLeyoB1ljjzo4LXv9wro_AeVNfPKOB20n_mnbzmRLwc`
   - `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_Ft4zb6a3L0unuKj-tmKatg_x9Q9ONWN`
   - `VITE_APP_CURRENCY` = `QAR`
4. Click **Save** or **Create**.

### Step 3: Run the Automated Deployment Script
You can trigger the build in two ways:
- **Option A (Via SSH / Terminal in hPanel)**:
  Open **SSH Access** or Web Terminal in hPanel and run:
  ```bash
  cd public_html
  bash deploy.sh
  ```
- **Option B (Via Hostinger Git Post-Deployment Command)**:
  In the Git configuration, under deployment commands, enter:
  ```bash
  bash deploy.sh
  ```
- **Option C (Manual NPM scripts)**:
  ```bash
  npm install --include=dev
  npm run build
  ```

### Step 4: Start the Node.js Application
1. In the **Node.js** manager in hPanel, click **"Start Application"** (or **"Restart"**).
2. Visit your website domain — your Najm Al Huda Workshop ERP is live!

---

## 🤖 Method 2: Automated GitHub Actions CI/CD (Zero-Downtime)

The repository already includes an automated GitHub Actions workflow (`.github/workflows/deploy-hostinger.yml`).

### Setup Steps:
1. In your **Hostinger hPanel**, go to **Advanced** → **SSH Access** and enable SSH.
2. Note your **SSH IP/Host**, **Port** (usually `65002`), and **SSH Username**.
3. In your **GitHub Repository**, go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - `HOSTINGER_SSH_HOST`: Your Hostinger SSH IP or domain.
   - `HOSTINGER_SSH_USER`: Your Hostinger SSH username (e.g. `u123456789`).
   - `HOSTINGER_SSH_KEY`: Your private SSH key (or password).
   - `HOSTINGER_SSH_PORT`: `65002` (or your Hostinger SSH port).
   - `HOSTINGER_APP_PATH`: `~/domains/yourdomain.com/public_html`
4. Every time you push code to `main`, GitHub Actions will run tests, bundle the app, deploy to Hostinger, and restart the server seamlessly!

---

## 🖥️ Method 3: Hostinger VPS Deployment (Ubuntu / Debian + PM2)

If you are using a Hostinger VPS:

1. Connect to your VPS via SSH:
   ```bash
   ssh root@your-vps-ip
   ```
2. Ensure Node.js 20+ and PM2 are installed:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
   apt-get install -y nodejs git
   npm install -g pm2
   ```
3. Clone your GitHub repository:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git /var/www/najm-erp
   cd /var/www/najm-erp
   ```
4. Run the automated deployment script:
   ```bash
   bash deploy.sh
   ```
5. Start the process with PM2:
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```
6. Set up Nginx reverse proxy to port `3000`:
   ```nginx
   server {
       listen 80;
       server_name erp.yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```
7. Enable SSL with Certbot:
   ```bash
   apt-get install -y certbot python3-certbot-nginx
   certbot --nginx -d erp.yourdomain.com
   ```

---

## 💾 Permanent Supabase PostgreSQL Database Persistence

- Supabase PostgreSQL is the **SINGLE permanent source of truth** for all ERP business data.
- The active project URL is `https://trxrbbirttlisohgbfck.supabase.co`.
- All operational entities (customers, vehicles, job cards, invoices, estimates, suppliers, purchase orders, inventory, transactions, settings) persist permanently in Supabase cloud tables.
- Redeployments, server restarts, Git updates, or Hostinger container restarts will **NEVER delete or reset** your Supabase data.
- Schema initialization in `supabase_schema.sql` uses `CREATE TABLE IF NOT EXISTS` and `ON CONFLICT DO NOTHING`, guaranteeing non-destructive runs.
- **To download a backup**:
  1. Go to your Supabase project dashboard → **Database** → **Backups**.
  2. Or inside the ERP app, navigate to **Settings** → **Backup Database** to export JSON backups anytime!

---

## ⚡ Key Optimizations Included in This Repository:
1. **Dynamic PORT Binding**: Automatically binds to `process.env.PORT` provided by Hostinger reverse proxies.
2. **Reverse Proxy Trust**: `app.set('trust proxy', 1)` ensures client IPs and secure sessions work seamlessly behind Hostinger's LiteSpeed/Nginx edge.
3. **Multi-Entry Point**: Root `server.js` and `index.js` allow Hostinger hPanel to start the server with any entry file naming convention.
4. **Static Asset Caching & Compression**: Built-in 1-day max-age cache headers and `.htaccess` gzip compression.
5. **Database Protection**: `.htaccess` rules strictly block unauthorized direct HTTP access to SQLite database files, environment variables, and git repositories.
6. **Graceful Shutdown**: Responds to `SIGTERM` and `SIGINT` signals for zero-downtime rolling restarts on Hostinger and PM2.
