/**
 * PM2 Ecosystem Configuration for Hostinger VPS & Cloud Hosting
 * Run with: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'najm-workshop-erp',
      script: './server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
        SUPABASE_URL: 'https://zigwijbljvsklepgbint.supabase.co',
        VITE_SUPABASE_URL: 'https://zigwijbljvsklepgbint.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZ3dpamJsanZza2xlcGdiaW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjE2OTMsImV4cCI6MjEwNzM5NzY5M30.FLeyoB1ljjzo4LXv9wro_AeVNfPKOB20n_mnbzmRLwc',
        VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZ3dpamJsanZza2xlcGdiaW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjE2OTMsImV4cCI6MjEwNzM5NzY5M30.FLeyoB1ljjzo4LXv9wro_AeVNfPKOB20n_mnbzmRLwc',
        VITE_APP_CURRENCY: 'QAR'
      }
    }
  ]
};
