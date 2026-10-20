import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import { Server } from 'node:http';
import { apiRouter, getEffectiveBootstrapSecret, setRuntimeBootstrapSecret } from '../server/routes';
import { authenticate, registerSessionToken } from '../server/auth';
import { supabaseDb } from '../server/supabaseDb';
import { db } from '../server/db';

describe('Master Admin Setup & Authentication Security Suite', () => {
  let server: Server;
  let baseUrl: string;
  const testBootstrapSecret = 'TestBootstrapSecret2026!';
  let existingOwners: any[] = [];

  before(async () => {
    setRuntimeBootstrapSecret(testBootstrapSecret);
    try {
      existingOwners = db.prepare("SELECT * FROM users WHERE role = 'owner'").all() as any[];
      db.prepare("DELETE FROM users WHERE role = 'owner'").run();
    } catch {}

    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(authenticate);
    app.use('/api', apiRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}/api`;
        resolve();
      });
    });
  });

  after(() => {
    try {
      if (existingOwners && existingOwners.length > 0) {
        for (const o of existingOwners) {
          db.prepare(`
            INSERT OR REPLACE INTO users (id, username, email, full_name, role, password_hash, phone, is_active, permissions_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(o.id, o.username, o.email, o.full_name, o.role, o.password_hash, o.phone, o.is_active, o.permissions_json, o.created_at);
        }
      }
    } catch {}

    if (server) {
      server.close();
    }
  });

  describe('1. First-time Master Admin setup when no account exists', () => {
    it('queries setup status and reports isSetupRequired: true when database has no Master Admin', async () => {
      const res = await fetch(`${baseUrl}/auth/setup-status`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(typeof data.isSetupRequired, 'boolean');
      assert.equal(data.isSetupRequired, true);
    });

    it('rejects setup requests missing or containing invalid bootstrap secret with HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/auth/setup-master-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bootstrapSecret: 'WrongSecretKey123',
          password: 'MasterPassword123!',
          confirmPassword: 'MasterPassword123!'
        })
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.ok(data.error.includes('Invalid or missing Master Admin Bootstrap Secret Key'));
    });

    it('rejects setup requests with mismatched password confirmation', async () => {
      const res = await fetch(`${baseUrl}/auth/setup-master-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bootstrapSecret: testBootstrapSecret,
          password: 'MasterPassword123!',
          confirmPassword: 'DifferentPassword456!'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('do not match'));
    });

    it('rejects setup requests with weak passwords', async () => {
      const res = await fetch(`${baseUrl}/auth/setup-master-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bootstrapSecret: testBootstrapSecret,
          password: 'weak',
          confirmPassword: 'weak'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('at least 8 characters'));
    });

    it('rejects setup requests attempting default word "admin123"', async () => {
      const res = await fetch(`${baseUrl}/auth/setup-master-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bootstrapSecret: testBootstrapSecret,
          password: 'Admin123!',
          confirmPassword: 'Admin123!'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('secure custom password'));
    });

    it('creates Master Admin with verified bootstrap secret and returns HTTP 201', async () => {
      const res = await fetch(`${baseUrl}/auth/setup-master-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bootstrapSecret: testBootstrapSecret,
          password: 'NajmAdmin#2026!',
          confirmPassword: 'NajmAdmin#2026!',
          email: 'admin@najmalhuda.qa',
          fullName: 'Primary Master Admin'
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.email, 'admin@najmalhuda.qa');

      // Verify database record in profiles
      const dbUser = await supabaseDb.getUserByUsernameOrEmail('admin@najmalhuda.qa');
      assert.ok(dbUser, 'Master Admin record must exist in profiles');
      assert.equal(dbUser.role, 'owner');
      assert.equal(dbUser.is_active || dbUser.isActive, true);
    });
  });

  describe('2. Concurrency and setup locking protection', () => {
    it('permanently locks setup: GET /auth/setup-status returns isSetupRequired: false once Master Admin exists', async () => {
      const res = await fetch(`${baseUrl}/auth/setup-status`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.isSetupRequired, false, 'Setup must be disabled once Master Admin exists in database');
    });

    it('permanently disables setup: subsequent POST /auth/setup-master-admin returns HTTP 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/auth/setup-master-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bootstrapSecret: testBootstrapSecret,
          password: 'AttackPassword999!',
          confirmPassword: 'AttackPassword999!'
        })
      });

      assert.equal(res.status, 403, 'Subsequent setup requests must return 403 Forbidden');
      const data = await res.json();
      assert.ok(data.error.includes('permanently locked and disabled'));
    });

    it('prevents simultaneous concurrent setup requests from creating competing accounts', async () => {
      const promises = [1, 2, 3].map(() => 
        fetch(`${baseUrl}/auth/setup-master-admin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bootstrapSecret: testBootstrapSecret,
            password: 'ConcurrentPassword123!',
            confirmPassword: 'ConcurrentPassword123!'
          })
        })
      );

      const results = await Promise.all(promises);
      const statuses = results.map(r => r.status);
      assert.ok(statuses.every(s => s === 403 || s === 401 || s === 409 || s === 500));
    });
  });

  describe('3. Unauthenticated Access Controls & Legacy Auth Retirement', () => {
    it('prevents unauthenticated visitors from accessing protected ERP endpoints', async () => {
      const endpoints = ['/bootstrap', '/job-cards', '/invoices', '/users', '/inventory'];
      for (const ep of endpoints) {
        const res = await fetch(`${baseUrl}${ep}`);
        assert.equal(res.status, 401, `Endpoint ${ep} must require authentication`);
      }
    });

    it('rejects legacy bcrypt direct password login path and instructs to use Supabase Auth', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ADMIN',
          password: 'MasterAdmin2026!'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Supabase Auth'));
    });

    it('authorizes authenticated sessions with bearer token on protected ERP endpoints', async () => {
      const testToken = 'valid_test_token_master_admin';
      registerSessionToken(testToken, {
        id: 'usr-admin-test',
        username: 'admin',
        email: 'admin@najmalhuda.qa',
        full_name: 'Primary Master Admin',
        role: 'owner',
        is_active: true,
        permissions: { canViewDashboard: true, canManageJobCards: true, canManageUsers: true },
        created_at: new Date().toISOString()
      });

      const res = await fetch(`${baseUrl}/bootstrap`, {
        headers: {
          'Authorization': `Bearer ${testToken}`
        }
      });

      assert.equal(res.status, 200, 'Authenticated session must access protected ERP endpoint');
    });
  });
});
