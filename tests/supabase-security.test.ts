import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isServiceRoleKey, isValidAnonKey, getEffectiveSupabaseKey } from '../src/lib/supabase';
import { isNetworkOrDnsError } from '../server/supabase';

describe('Supabase Frontend Security & Anon Key Handling', () => {
  it('correctly detects service role secret keys and prevents their usage on frontend', () => {
    assert.strictEqual(isServiceRoleKey('sb_secret_IyX3kBsUH3sGjejqYm47PQ_J65d1mUV'), true);
    assert.strictEqual(isServiceRoleKey('service_role_key_secret_1234567890'), true);
    assert.strictEqual(isServiceRoleKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), false);

    assert.strictEqual(isValidAnonKey('sb_secret_IyX3kBsUH3sGjejqYm47PQ_J65d1mUV'), false);
    assert.strictEqual(isValidAnonKey('service_role_key_secret_1234567890'), false);
  });

  it('validates legitimate public anon JWT keys', () => {
    const validJwtKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxOTAwMDAwMDAwfQ.signature_goes_here_long_enough';
    assert.strictEqual(isValidAnonKey(validJwtKey), true);
  });

  it('retrieves effective anon key without exposing secret key', () => {
    const key = getEffectiveSupabaseKey();
    if (key) {
      assert.ok(!key.startsWith('sb_secret_'), 'Key must not be a service role key');
      assert.ok(!key.toLowerCase().includes('service_role'), 'Key must not include service_role');
    }
  });

  it('correctly identifies network and DNS errors vs database schema errors', () => {
    const netErr1 = { message: 'TypeError: fetch failed', details: 'getaddrinfo ENOTFOUND host.supabase.co', status: 0 };
    assert.strictEqual(isNetworkOrDnsError(netErr1), true);

    const netErr2 = { message: 'getaddrinfo ENOTFOUND host.supabase.co' };
    assert.strictEqual(isNetworkOrDnsError(netErr2), true);

    const dbSchemaErr = { message: 'relation "public.customers" does not exist', code: '42P01', status: 404 };
    assert.strictEqual(isNetworkOrDnsError(dbSchemaErr), false);
  });

  it('guarantees active project URL is used and rejects outdated project references', async () => {
    const { getSupabaseServerUrl, ACTIVE_SUPABASE_URL } = await import('../server/supabase');
    const url = getSupabaseServerUrl();
    assert.strictEqual(url, ACTIVE_SUPABASE_URL);
    assert.ok(!url.includes('tpbihpzsfjpobqwdbrmm'));
  });
});
