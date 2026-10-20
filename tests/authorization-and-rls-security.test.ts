import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { Server } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { apiRouter } from '../server/routes';
import { authenticate, registerSessionToken } from '../server/auth';
import { isServiceRoleKey, isValidAnonKey } from '../src/lib/supabase';

describe('Security Audit — API Authorization & Least-Privilege RLS', () => {
  let server: Server;
  let baseUrl: string;
  let adminToken: string;
  let technicianToken: string;

  before(async () => {
    const app = express();
    app.use(express.json());
    app.use(authenticate);
    app.use('/api', apiRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number };
        baseUrl = `http://127.0.0.1:${addr.port}/api`;
        resolve();
      });
    });

    // Create session for Administrator (owner)
    adminToken = 'admin_sec_token_valid';
    registerSessionToken(adminToken, {
      id: 'usr-admin-sec',
      username: 'admin_security',
      email: 'admin_sec@najm.qa',
      full_name: 'Security Admin',
      role: 'owner',
      is_active: true,
      permissions: { canManageUsers: true, canManageBilling: true },
      created_at: new Date().toISOString()
    });

    // Create session for Technician (low-privilege staff)
    technicianToken = 'tech_sec_token_valid';
    registerSessionToken(technicianToken, {
      id: 'usr-tech-sec',
      username: 'tech_tariq',
      email: 'tariq@najm.qa',
      full_name: 'Tariq Al-Mansoor',
      role: 'technician',
      is_active: true,
      permissions: { canViewDashboard: true, canManageJobCards: true },
      created_at: new Date().toISOString()
    });
  });

  after(() => {
    if (server) {
      server.close();
    }
  });

  // ============================================================================
  // 1. UNPROTECTED ENDPOINT REJECTION (401 UNAUTHORIZED)
  // ============================================================================
  describe('Unauthenticated Access Control (401 Unauthorized)', () => {
    const protectedGetEndpoints = [
      '/customers',
      '/vehicles',
      '/suppliers',
      '/job-cards',
      '/invoices',
      '/estimates',
      '/inventory',
      '/purchase-orders',
      '/goods-receipt-notes',
      '/stock-movements',
      '/scrap/intakes',
      '/scrap/sales',
      '/audit-logs',
      '/financial/accounts',
      '/financial/transactions',
      '/financial/overview',
      '/financial/reports',
      '/search?q=test',
      '/users'
    ];

    for (const endpoint of protectedGetEndpoints) {
      it(`rejects unauthenticated GET ${endpoint} with 401 Unauthorized`, async () => {
        const res = await fetch(`${baseUrl}${endpoint}`);
        assert.strictEqual(
          res.status,
          401,
          `Expected GET ${endpoint} to reject unauthenticated request with 401, but got ${res.status}`
        );
        const data = await res.json();
        assert.ok(data.error, `Response from ${endpoint} should contain an error message`);
      });
    }

    const protectedPostEndpoints = [
      { path: '/customers', body: { name: 'Hacked Customer', phone: '+97400000000' } },
      { path: '/vehicles', body: { plateNumber: '999999' } },
      { path: '/suppliers', body: { name: 'Rogue Supplier' } },
      { path: '/financial/accounts', body: { name: 'Secret Off-book Fund' } },
      { path: '/financial/transactions', body: { amount: 100000, type: 'MONEY_OUT' } },
      { path: '/financial/advances/apply', body: { advanceId: 'test' } },
      { path: '/financial/advances/refund', body: { advanceId: 'test' } },
      { path: '/users', body: { username: 'attacker', password: 'Password123!', role: 'admin' } },
      { path: '/sequences/generate', body: { type: 'INVOICE' } },
    ];

    for (const { path: endpoint, body } of protectedPostEndpoints) {
      it(`rejects unauthenticated POST ${endpoint} with 401 Unauthorized`, async () => {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        assert.strictEqual(
          res.status,
          401,
          `Expected POST ${endpoint} to reject unauthenticated request with 401, but got ${res.status}`
        );
      });
    }

    it('rejects invalid or forged bearer tokens with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/customers`, {
        headers: { 'Authorization': 'Bearer forged-invalid-token-12345' }
      });
      assert.strictEqual(res.status, 401);
    });
  });

  // ============================================================================
  // 2. ROLE-BASED ACCESS CONTROL (RBAC) (403 FORBIDDEN VS 200 OK)
  // ============================================================================
  describe('Role-Based Authorization Enforcement', () => {
    it('allows technician to read non-financial operational records', async () => {
      const custRes = await fetch(`${baseUrl}/customers`, {
        headers: { 'Authorization': `Bearer ${technicianToken}` }
      });
      assert.strictEqual(custRes.status, 200);

      const jcRes = await fetch(`${baseUrl}/job-cards`, {
        headers: { 'Authorization': `Bearer ${technicianToken}` }
      });
      assert.strictEqual(jcRes.status, 200);
    });

    it('blocks technician from accessing financial accounts (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/financial/accounts`, {
        headers: { 'Authorization': `Bearer ${technicianToken}` }
      });
      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.ok(data.error.includes('Access denied') || data.error.includes('roles'));
    });

    it('blocks technician from accessing financial overview & revenue (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/financial/overview`, {
        headers: { 'Authorization': `Bearer ${technicianToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    it('blocks technician from accessing financial reports (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/financial/reports`, {
        headers: { 'Authorization': `Bearer ${technicianToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    it('blocks technician from accessing system audit logs (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/audit-logs`, {
        headers: { 'Authorization': `Bearer ${technicianToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    it('blocks technician from managing users list (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        headers: { 'Authorization': `Bearer ${technicianToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    it('blocks technician from deleting customers, vehicles, or invoices (403 Forbidden)', async () => {
      const delCust = await fetch(`${baseUrl}/customers/cust-fake-id`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${technicianToken}` }
      });
      assert.strictEqual(delCust.status, 403);

      const delVeh = await fetch(`${baseUrl}/vehicles/veh-fake-id`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${technicianToken}` }
      });
      assert.strictEqual(delVeh.status, 403);

      const delInvc = await fetch(`${baseUrl}/invoices/invc-fake-id`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${technicianToken}` }
      });
      assert.strictEqual(delInvc.status, 403);
    });

    it('allows admin/owner to access financial accounts, overview, and audit logs', async () => {
      const accRes = await fetch(`${baseUrl}/financial/accounts`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(accRes.status, 200);

      const ovRes = await fetch(`${baseUrl}/financial/overview`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(ovRes.status, 200);

      const auditRes = await fetch(`${baseUrl}/audit-logs`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(auditRes.status, 200);

      const usersRes = await fetch(`${baseUrl}/users`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(usersRes.status, 200);
    });
  });

  // ============================================================================
  // 3. SCHEMA & RLS STATIC POLICY AUDIT
  // ============================================================================
  describe('Schema & RLS Static Policy Audit', () => {
    const schemaPath = path.resolve(process.cwd(), 'supabase_schema.sql');
    const migrationPath = path.resolve(process.cwd(), 'supabase_migrations', '06_secure_rls_and_least_privilege.sql');

    const expected28Tables = [
      'users', 'sessions', 'settings', 'companies', 'document_sequences',
      'customers', 'vehicles', 'suppliers', 'inventory_items', 'stock_movements',
      'purchase_orders', 'goods_receipt_notes', 'job_cards', 'job_status_history',
      'invoices', 'estimates', 'counter_sales', 'scrap_rates', 'scrap_intakes',
      'scrap_sales', 'technicians', 'labor_rates', 'paint_codes',
      'financial_accounts', 'financial_transactions', 'financial_allocations',
      'journal_entries', 'audit_logs'
    ];

    it('guarantees all 28 tables are enumerated for RLS hardening', () => {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');

      for (const table of expected28Tables) {
        assert.ok(
          schemaSql.includes(`'${table}'`),
          `supabase_schema.sql must include table '${table}' in RLS enforcement array`
        );
        assert.ok(
          migrationSql.includes(`'${table}'`),
          `06_secure_rls_and_least_privilege.sql must include table '${table}' in RLS enforcement array`
        );
      }
    });

    it('verifies broad permissive USING (true) is never granted to anon or public', () => {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');

      for (const sql of [schemaSql, migrationSql]) {
        // Assert no policy gives public or anon full access
        assert.strictEqual(
          sql.includes('TO anon USING (true) WITH CHECK (true)'),
          false,
          'Must not grant wildcard access to anon'
        );
        assert.strictEqual(
          sql.includes('TO public USING (true) WITH CHECK (true)'),
          false,
          'Must not grant wildcard access to public'
        );
        assert.strictEqual(
          sql.includes('TO authenticated USING (true) WITH CHECK (true)'),
          false,
          'Must not grant wildcard access to authenticated'
        );
      }
    });

    it('ensures REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, public is present', () => {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      assert.ok(schemaSql.includes('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, public;'));
    });

    it('ensures public settings policy is strictly restricted to primary branding', () => {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      assert.ok(schemaSql.includes("USING (id = 'primary')"));
    });
  });

  // ============================================================================
  // 4. FRONTEND KEY SEGREGATION & LEAST PRIVILEGE
  // ============================================================================
  describe('Frontend Key Segregation', () => {
    it('detects and rejects service role keys on the frontend client', () => {
      assert.strictEqual(isServiceRoleKey('sb_secret_sample_key_12345'), true);
      assert.strictEqual(isValidAnonKey('sb_secret_sample_key_12345'), false);
    });

    it('permits valid public anon JWT keys for frontend read access', () => {
      const anonJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeHJiYmlydHRsaXNvaGdiZmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTkwMDAwMDAwMH0.signature';
      assert.strictEqual(isValidAnonKey(anonJwt), true);
    });
  });
});
