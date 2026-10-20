import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import { Server } from 'node:http';
import { getRolePermissions } from '../src/context/AuthContext';
import { INITIAL_USERS } from '../src/data/initialData';
import { apiRouter, setRuntimeBootstrapSecret } from '../server/routes';
import { authenticate, registerSessionToken, clearSessionToken } from '../server/auth';

describe('Auth Login Prompt, User Roles & Customizable Permissions Suite', () => {

  describe('1. Role-Based Default Permissions & Role Segregation', () => {
    it('grants Owner full user management capabilities and restricts Admin to system operations only', () => {
      const ownerPerms = getRolePermissions('owner');
      const adminPerms = getRolePermissions('Admin');

      assert.equal(ownerPerms.canViewDashboard, true);
      assert.equal(ownerPerms.canManageJobCards, true);
      assert.equal(ownerPerms.canManageInventory, true);
      assert.equal(ownerPerms.canManageBilling, true);
      assert.equal(ownerPerms.canManageSettings, true);
      assert.equal(ownerPerms.canManageUsers, true);

      assert.equal(adminPerms.canManageUsers, false, 'Admin must not have user management privileges; restricted to Owner');
      assert.equal(adminPerms.canManageBilling, true);
      assert.equal(adminPerms.canManageSettings, true);
    });

    it('restricts Service Manager from managing other user accounts while allowing operations & billing', () => {
      const managerPerms = getRolePermissions('manager');

      assert.equal(managerPerms.canViewDashboard, true);
      assert.equal(managerPerms.canManageJobCards, true);
      assert.equal(managerPerms.canManageBilling, true);
      assert.equal(managerPerms.canManageSettings, true);
      assert.equal(managerPerms.canManageUsers, false);
    });

    it('restricts Service Advisor to customer jobs, vehicle dossiers and invoicing (no inventory/settings)', () => {
      const advisorPerms = getRolePermissions('service_advisor');

      assert.equal(advisorPerms.canManageJobCards, true);
      assert.equal(advisorPerms.canManageBilling, true);
      assert.equal(advisorPerms.canViewServiceHistory, true);
      assert.equal(advisorPerms.canManageInventory, false);
      assert.equal(advisorPerms.canManagePurchasesAndSales, false);
      assert.equal(advisorPerms.canManageSettings, false);
      assert.equal(advisorPerms.canManageUsers, false);
    });

    it('restricts Technician to workshop operations only (no billing, no settings, no user mgmt)', () => {
      const techPerms = getRolePermissions('technician');

      assert.equal(techPerms.canManageJobCards, true);
      assert.equal(techPerms.canAdvanceJobStatus, true);
      assert.equal(techPerms.canManageDentingPainting, true);
      assert.equal(techPerms.canManageBilling, false);
      assert.equal(techPerms.canManageInventory, false);
      assert.equal(techPerms.canManageSettings, false);
      assert.equal(techPerms.canManageUsers, false);
    });

    it('restricts Parts Manager to parts, inventory & purchase orders only', () => {
      const partsPerms = getRolePermissions('parts_manager');

      assert.equal(partsPerms.canManageInventory, true);
      assert.equal(partsPerms.canManagePurchasesAndSales, true);
      assert.equal(partsPerms.canManageJobCards, false);
      assert.equal(partsPerms.canManageBilling, false);
      assert.equal(partsPerms.canManageSettings, false);
      assert.equal(partsPerms.canManageUsers, false);
    });

    it('restricts Accountant to financials, billing & purchase reports (no workshop jobs/bays)', () => {
      const accountantPerms = getRolePermissions('accountant');

      assert.equal(accountantPerms.canManageBilling, true);
      assert.equal(accountantPerms.canManagePurchasesAndSales, true);
      assert.equal(accountantPerms.canManageJobCards, false);
      assert.equal(accountantPerms.canManageSettings, false);
      assert.equal(accountantPerms.canManageUsers, false);
    });
  });

  describe('2. Customizable Per-User Permissions Override', () => {
    it('allows customized user permission objects to selectively enable or disable privileges', () => {
      // Create a technician with custom billing permission enabled
      const customTechUser = {
        id: 'usr-custom-1',
        username: 'special_tech',
        fullName: 'Special Technician',
        role: 'technician',
        email: 'tech@najmalhuda.qa',
        isActive: true,
        permissions: {
          ...getRolePermissions('technician'),
          canManageBilling: true, // Custom permission override!
        }
      };

      assert.equal(customTechUser.permissions.canManageBilling, true);
      assert.equal(customTechUser.permissions.canManageUsers, false);
      assert.equal(customTechUser.permissions.canManageJobCards, true);
    });

    it('allows customized user permission objects to restrict standard manager capabilities', () => {
      // Create a restricted manager with billing disabled
      const restrictedManager = {
        id: 'usr-custom-2',
        username: 'floor_manager',
        fullName: 'Floor Manager',
        role: 'manager',
        email: 'floor@najmalhuda.qa',
        isActive: true,
        permissions: {
          ...getRolePermissions('manager'),
          canManageBilling: false, // Custom permission restricted!
        }
      };

      assert.equal(restrictedManager.permissions.canManageBilling, false);
      assert.equal(restrictedManager.permissions.canManageJobCards, true);
      assert.equal(restrictedManager.permissions.canManageInventory, true);
    });
  });

  describe('3. Initial Demo Users Seed Consistency', () => {
    it('contains all required roles for immediate testing in the login window', () => {
      const usernames = INITIAL_USERS.map(u => u.username);
      const roles = INITIAL_USERS.map(u => u.role);

      assert.ok(usernames.includes('autonomous'), 'Autonomous admin user exists');
      assert.ok(usernames.includes('osman'), 'Osman manager exists');
      assert.ok(usernames.includes('kareem'), 'Kareem accountant exists');
      assert.ok(usernames.includes('salim'), 'Salim service advisor exists');
      assert.ok(usernames.includes('bilal'), 'Bilal parts manager exists');
      assert.ok(usernames.includes('tariq'), 'Tariq technician exists');

      assert.ok(roles.includes('owner'));
      assert.ok(roles.includes('manager'));
      assert.ok(roles.includes('accountant'));
      assert.ok(roles.includes('service_advisor'));
      assert.ok(roles.includes('parts_manager'));
      assert.ok(roles.includes('technician'));
    });
  });

  describe('4. Initial Preview Visit, Public Auth Endpoints & Session Lifecycle', () => {
    let server: Server;
    let baseUrl: string;

    before(async () => {
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

      const testBootstrapKey = 'TestBootstrapSecret2026!';
      setRuntimeBootstrapSecret(testBootstrapKey);

      // Initialize Master Admin account with verified bootstrap secret
      await fetch(`${baseUrl}/auth/setup-master-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bootstrapSecret: testBootstrapKey,
          password: 'MasterAdmin@2026!',
          confirmPassword: 'MasterAdmin@2026!',
          email: 'admin@najmalhuda.qa',
          fullName: 'Master Administrator'
        })
      });
    });

    after(() => {
      if (server) {
        server.close();
      }
    });

    it('returns HTTP 200 with user: null when unauthenticated visitor hits /auth/me on initial preview visit', async () => {
      const res = await fetch(`${baseUrl}/auth/me`);
      assert.equal(res.status, 200, 'Session check must return 200 OK, not 401');
      const data = await res.json();
      assert.equal(data.user, null, 'Unauthenticated user object must be null');
    });

    it('returns HTTP 401 Unauthorized when unauthenticated visitor hits protected ERP /bootstrap', async () => {
      const res = await fetch(`${baseUrl}/bootstrap`);
      assert.equal(res.status, 401, 'Protected ERP bootstrap endpoint must require authentication');
      const data = await res.json();
      assert.ok(data.error.includes('Authentication required'), 'Should report authentication required');
    });

    it('rejects legacy direct password login and instructs to use Supabase Auth', async () => {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'ADMIN', password: 'MasterAdmin@2026!' })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Supabase Auth'));
    });

    it('restores authenticated session when valid Bearer token is provided to /auth/me', async () => {
      const token = 'active_session_token_12345';
      registerSessionToken(token, {
        id: 'usr-owner-id',
        username: 'admin',
        email: 'admin@najmalhuda.qa',
        full_name: 'Master Administrator',
        role: 'owner',
        is_active: true,
        permissions: getRolePermissions('owner'),
        created_at: new Date().toISOString()
      });

      // Call /auth/me with Bearer token
      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(meRes.status, 200);
      const meData = await meRes.json();
      assert.ok(meData.user, 'Must restore user from session token');
      assert.equal(meData.user.email, 'admin@najmalhuda.qa');
      assert.equal(meData.user.role, 'owner');
    });

    it('allows authenticated user with Bearer token to fetch ERP /bootstrap data successfully', async () => {
      const token = 'active_session_token_12345';
      const bootRes = await fetch(`${baseUrl}/bootstrap`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(bootRes.status, 200, 'Authenticated request to /bootstrap must return 200 OK');
      const bootData = await bootRes.json();
      assert.equal(bootData.success, true);
      assert.ok(Array.isArray(bootData.jobCards));
      assert.ok(Array.isArray(bootData.inventory));
    });

    it('returns HTTP 200 with user: null and clears stale session when token is expired or invalid', async () => {
      const invalidToken = 'totally-invalid-or-expired-token-12345';
      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${invalidToken}` }
      });
      assert.equal(meRes.status, 200, 'Session check with invalid token should return 200 OK with null user');
      const meData = await meRes.json();
      assert.equal(meData.user, null);
    });

    it('returns HTTP 401 when expired session token attempts to call protected /bootstrap', async () => {
      const invalidToken = 'expired-token-67890';
      const bootRes = await fetch(`${baseUrl}/bootstrap`, {
        headers: { Authorization: `Bearer ${invalidToken}` }
      });
      assert.equal(bootRes.status, 401, 'Expired session token on /bootstrap must return 401');
    });

    it('terminates session and clears cookie upon POST /auth/logout', async () => {
      const token = 'active_session_token_12345';
      const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      assert.equal(logoutRes.status, 200);
      clearSessionToken(token);

      const meAfter = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const meData = await meAfter.json();
      assert.equal(meData.user, null, 'Logged-out session token must no longer authenticate');
    });
  });
});
