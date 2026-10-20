import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import cookieParser from 'cookie-parser';
import { apiRouter } from '../server/routes';
import { authenticate, registerSessionToken, clearSessionToken, hashPassword, verifyPassword } from '../server/auth';
import { db } from '../server/db.ts';
import { supabaseDb } from '../server/supabaseDb';

describe('Separate Staff Authentication & Role-Based Access Control', () => {
  let app: express.Express;
  let server: http.Server;
  let baseUrl: string;

  const OWNER_TOKEN = 'test_owner_session_token_' + Date.now();
  const OWNER_ID = '7546d542-d035-498c-9e37-e2f0d8cf20db';
  const OWNER_EMAIL = 'autonomous.hostinger@gmail.com';

  before(async () => {
    const oldStaff = await supabaseDb.getUserByUsernameOrEmail('advisor_ahmed');
    if (oldStaff?.id) {
      await supabaseDb.deleteUser(oldStaff.id);
    }
    const oldWeak = await supabaseDb.getUserByUsernameOrEmail('weak_user');
    if (oldWeak?.id) {
      await supabaseDb.deleteUser(oldWeak.id);
    }
    const oldImpostor = await supabaseDb.getUserByUsernameOrEmail('impostor_owner');
    if (oldImpostor?.id) {
      await supabaseDb.deleteUser(oldImpostor.id);
    }
    try {
      db.prepare("DELETE FROM staff_accounts WHERE username LIKE 'advisor_%' OR username LIKE 'weak_%' OR username LIKE 'impostor_%'").run();
      db.prepare("DELETE FROM users WHERE username LIKE 'advisor_%' OR username LIKE 'weak_%' OR username LIKE 'impostor_%'").run();
    } catch {}

    app = express();
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

    // Register active Owner session
    registerSessionToken(OWNER_TOKEN, {
      id: OWNER_ID,
      username: 'owner',
      email: OWNER_EMAIL,
      full_name: 'Workshop Owner',
      role: 'owner',
      is_active: true,
      permissions: { canManageUsers: true, canManageSettings: true, canManageBilling: true },
      created_at: new Date().toISOString()
    });
  });

  after(async () => {
    clearSessionToken(OWNER_TOKEN);
    const oldStaff = await supabaseDb.getUserByUsernameOrEmail('advisor_ahmed');
    if (oldStaff?.id) {
      await supabaseDb.deleteUser(oldStaff.id);
    }
    try {
      db.prepare("DELETE FROM staff_accounts WHERE username LIKE 'advisor_%' OR username LIKE 'weak_%' OR username LIKE 'impostor_%'").run();
      db.prepare("DELETE FROM users WHERE username LIKE 'advisor_%' OR username LIKE 'weak_%' OR username LIKE 'impostor_%'").run();
    } catch {}
    if (server) {
      server.close();
    }
  });

  // ============================================================================
  // 1. Password Hashing & Cryptographic Security
  // ============================================================================
  describe('Password Hashing & Bcrypt Security', { concurrency: 1 }, () => {
    it('hashes passwords using bcrypt ($2a$ or $2b$ format)', () => {
      const plain = 'StrongPass123!';
      const hash = hashPassword(plain);
      assert.ok(hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Password must be hashed with bcrypt');
      assert.notStrictEqual(hash, plain, 'Plaintext password must never be stored');
      assert.ok(verifyPassword(plain, hash), 'Verify password must validate correct password');
      assert.ok(!verifyPassword('WrongPass123!', hash), 'Verify password must reject incorrect password');
    });
  });

  // ============================================================================
  // 2. Staff Account Creation & Restrictions
  // ============================================================================
  describe('Staff Account Creation by Owner', { concurrency: 1 }, () => {
    it('allows Owner to create a valid staff account', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OWNER_TOKEN}`
        },
        body: JSON.stringify({
          username: 'advisor_ahmed',
          email: 'ahmed@najmalhuda.qa',
          fullName: 'Ahmed Al-Kuwari',
          role: 'service_advisor',
          phone: '+974 5555 1234',
          password: 'AhmedSecure2026!',
          permissions: { canManageJobCards: true }
        })
      });

      assert.strictEqual(res.status, 201);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.user.username, 'advisor_ahmed');
      assert.strictEqual(json.user.role, 'service_advisor');
      assert.strictEqual(json.user.password_hash, undefined, 'Password hash must never be exposed');
    });

    it('rejects creating a staff account with role "owner"', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OWNER_TOKEN}`
        },
        body: JSON.stringify({
          username: 'impostor_owner',
          email: 'fakeowner@najmalhuda.qa',
          fullName: 'Fake Owner',
          role: 'owner',
          password: 'Password123!'
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.ok(json.error.includes('Owner role'));
    });

    it('rejects weak passwords during staff account creation', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OWNER_TOKEN}`
        },
        body: JSON.stringify({
          username: 'weak_user',
          email: 'weak@najmalhuda.qa',
          fullName: 'Weak User',
          role: 'technician',
          password: '123'
        })
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.ok(json.error.includes('at least 8 characters'));
    });
  });

  // ============================================================================
  // 3. Staff Server-Side Login (Username & Email)
  // ============================================================================
  describe('Staff Server-Side Authentication', { concurrency: 1 }, () => {
    let staffToken = '';

    it('authenticates staff using username and password', async () => {
      const res = await fetch(`${baseUrl}/auth/session-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'advisor_ahmed',
          password: 'AhmedSecure2026!'
        })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.user.username, 'advisor_ahmed');
      assert.ok(json.token, 'Must return session token');
      assert.strictEqual(json.user.password_hash, undefined, 'Must not expose password hash');

      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie?.includes('session_token='), 'Must set HttpOnly session_token cookie');

      staffToken = json.token;
    });

    it('authenticates staff using email and password', async () => {
      const res = await fetch(`${baseUrl}/auth/session-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ahmed@najmalhuda.qa',
          password: 'AhmedSecure2026!'
        })
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.user.email, 'ahmed@najmalhuda.qa');
    });

    it('returns generic authentication error for invalid password', async () => {
      const res = await fetch(`${baseUrl}/auth/session-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'advisor_ahmed',
          password: 'WrongPassword999!'
        })
      });

      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.error, 'Invalid username/email or password.');
    });

    it('returns generic authentication error for nonexistent account', async () => {
      const res = await fetch(`${baseUrl}/auth/session-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nonexistent_user',
          password: 'Password123!'
        })
      });

      assert.strictEqual(res.status, 401);
      const json = await res.json();
      assert.strictEqual(json.error, 'Invalid username/email or password.');
    });

    // ============================================================================
    // 4. Role-Based Access Control
    // ============================================================================
    it('blocks staff from accessing /api/users management endpoint (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/users`, {
        headers: { 'Authorization': `Bearer ${staffToken}` }
      });
      assert.strictEqual(res.status, 403);
    });

    it('blocks Admin role from staff account management (strictly Owner only)', async () => {
      const adminToken = 'test_admin_token_' + Date.now();
      registerSessionToken(adminToken, {
        id: 'admin_test_user_id',
        username: 'workshop_admin',
        email: 'admin@najmalhuda.qa',
        full_name: 'Workshop Administrator',
        role: 'admin',
        is_active: true,
        permissions: { canManageUsers: true },
        created_at: new Date().toISOString()
      });

      try {
        // 1. Direct GET /api/users
        const getRes = await fetch(`${baseUrl}/users`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert.strictEqual(getRes.status, 403, 'Admin must be blocked from GET /users');
        const getJson = await getRes.json();
        assert.ok(getJson.error.includes('Owner'), 'Error must specify Owner requirement');

        // 2. Direct POST /api/users
        const postRes = await fetch(`${baseUrl}/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({
            username: 'admin_created_staff',
            password: 'AdminPassword123!',
            fullName: 'Admin Created Staff',
            role: 'technician'
          })
        });
        assert.strictEqual(postRes.status, 403, 'Admin must be blocked from POST /users');

        // 3. Direct DELETE /api/users/:id
        const delRes = await fetch(`${baseUrl}/users/some-target-id`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        assert.strictEqual(delRes.status, 403, 'Admin must be blocked from DELETE /users');
      } finally {
        clearSessionToken(adminToken);
      }
    });

    it('blocks staff from promoting themselves to owner (403 Forbidden)', async () => {
      const staffUser = await supabaseDb.getUserByUsernameOrEmail('advisor_ahmed');
      const res = await fetch(`${baseUrl}/users/${staffUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`
        },
        body: JSON.stringify({
          role: 'owner'
        })
      });
      assert.strictEqual(res.status, 403);
    });

    // ============================================================================
    // 5. Account Deactivation & Session Revocation
    // ============================================================================
    it('allows Owner to deactivate staff account, immediately revoking active sessions', async () => {
      const staffUser = await supabaseDb.getUserByUsernameOrEmail('advisor_ahmed');

      // Owner deactivates staff account
      const deactRes = await fetch(`${baseUrl}/users/${staffUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OWNER_TOKEN}`
        },
        body: JSON.stringify({
          isActive: false
        })
      });
      assert.strictEqual(deactRes.status, 200);

      // Verify that staff session token is immediately revoked
      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { 'Authorization': `Bearer ${staffToken}` }
      });
      const meJson = await meRes.json();
      assert.strictEqual(meJson.user, null, 'Deactivated staff session must be immediately rejected');

      // Verify login is blocked with deactivation message
      const loginRes = await fetch(`${baseUrl}/auth/session-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'advisor_ahmed',
          password: 'AhmedSecure2026!'
        })
      });
      assert.strictEqual(loginRes.status, 403);
      const loginJson = await loginRes.json();
      assert.ok(loginJson.error.toLowerCase().includes('deactivated'));
    });

    it('reactivates staff account cleanly upon Owner reactivation', async () => {
      const staffUser = await supabaseDb.getUserByUsernameOrEmail('advisor_ahmed');

      const reactRes = await fetch(`${baseUrl}/users/${staffUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OWNER_TOKEN}`
        },
        body: JSON.stringify({
          isActive: true
        })
      });
      assert.strictEqual(reactRes.status, 200);

      // Login succeeds again
      const loginRes = await fetch(`${baseUrl}/auth/session-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'advisor_ahmed',
          password: 'AhmedSecure2026!'
        })
      });
      assert.strictEqual(loginRes.status, 200);
    });

    // ============================================================================
    // 6. Owner Protection Safeguards
    // ============================================================================
    it('blocks deleting or deactivating the Owner account', async () => {
      const delOwnerRes = await fetch(`${baseUrl}/users/${OWNER_ID}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${OWNER_TOKEN}` }
      });
      assert.strictEqual(delOwnerRes.status, 400); // Cannot delete current logged-in account or owner

      const deactOwnerRes = await fetch(`${baseUrl}/users/${OWNER_ID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OWNER_TOKEN}`
        },
        body: JSON.stringify({
          role: 'technician'
        })
      });
      // Owner role cannot be demoted
      const ownerCheck = await supabaseDb.getUserById(OWNER_ID);
      assert.strictEqual(ownerCheck?.role, 'owner');
    });
  });
});
