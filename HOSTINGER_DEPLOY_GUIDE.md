# 🚀 Hostinger Web Hosting Deployment Guide for Najm Al Huda ERP

This guide provides step-by-step instructions to successfully deploy and run the **Najm Al Huda Workshop Management System** on Hostinger.

---

## 📋 Prerequisites on Hostinger
- **Node.js Version**: **v18.x**, **v20.x**, or **v22.x** (LTS recommended)
- **Application Startup File**: `server.js` or `app.js` (both are provided at the root)
- **Package Manager**: `npm` or `bun`

---

## 🛠️ Method 1: Hostinger hPanel Node.js Application Manager (Cloud / Business Web Hosting)

1. **Log in to Hostinger hPanel**:
   - Go to your hosting dashboard and select **Node.js** under the **Advanced** section.

2. **Create/Configure the Node.js Application**:
   - **Node.js Version**: Select **20.x** or **22.x**.
   - **Application Mode**: `Production`
   - **Application Root**: `public_html` (or your subfolder/subdomain path)
   - **Application URL**: `yourdomain.com`
   - **Application Startup File**: `server.js` (or `app.js`)
   - **Environment Variables**:
     - `SUPABASE_URL`: `https://trxrbbirttlisohgbfck.supabase.co`
     - `SUPABASE_ANON_KEY`: `your-supabase-anon-key`
     - `VITE_SUPABASE_URL`: `https://trxrbbirttlisohgbfck.supabase.co`
     - `VITE_SUPABASE_ANON_KEY`: `your-supabase-anon-key`
     - `VITE_APP_CURRENCY`: `QAR`

3. **Upload the Files**:
   - Upload or git pull all project files into your application root folder (`public_html`).
   - Run the initial schema migration once in your Supabase SQL Editor (`supabase_schema.sql`).

4. **Install Dependencies**:
   - In the Node.js Manager in hPanel, click **"NPM Install"** (or open the SSH / Terminal and run `npm install --omit=dev`).

5. **Start / Restart the App**:
   - Click **"Restart Application"** in hPanel.
   - Your application will now be live at `https://yourdomain.com`.

---

## 🖥️ Method 2: Hostinger VPS (Ubuntu / Debian with PM2)

If you are using a Hostinger VPS:

1. **Connect via SSH**:
   ```bash
   ssh root@YOUR_SERVER_IP
   ```

2. **Clone / Upload Project**:
   ```bash
   cd /var/www/najm-al-huda
   npm install
   ```

3. **Start with PM2**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "najm-erp"
   pm2 save
   pm2 startup
   ```

4. **Configure Nginx / Reverse Proxy**:
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

---

## 🔍 Troubleshooting Common Hostinger Errors

| Issue | Cause | Solution |
|---|---|---|
| **503 Service Unavailable** | Startup file mismatch or app crashed on boot | Ensure **Application Startup File** in hPanel is set to `server.js`. |
| **Cannot find module 'tsx'** | Hostinger production runner runs pure `node` | We provided a hybrid `server.js` that automatically executes without requiring global `tsx`. |
| **EACCES / Read-only DB** | `data/` folder lacks write permissions | Run `chmod -R 775 data` or ensure the web server user owns the folder. |
| **Blank White Screen** | Missing `.htaccess` rewrite rules for SPA | Ensure the `.htaccess` file is uploaded to `public_html`. |
| **CORS / Supabase sync error** | Network policy or missing env vars | The backend automatically uses local SQLite fallback if Supabase is unreachable. |

---

## 🔑 Default Login Credentials
- **Owner / Admin**: `autonomous` | Password: `admin123`
- **Manager**: `osman` | Password: `osman123`
