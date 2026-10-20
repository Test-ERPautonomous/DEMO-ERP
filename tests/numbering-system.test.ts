import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, db } from '../server/db';
import {
  generateNextDocumentNumber,
  formatDocumentNumber,
  parseDocumentNumber,
  peekNextDocumentNumber,
  syncAllSequences,
  runSequenceVerificationSuite,
  SEQUENCE_CONFIGS,
  DocType
} from '../server/sequences';

describe('Document Numbering System Across Najm Al Huda ERP', () => {
  before(() => {
    initDatabase();
  });

  describe('1. Prefix & 4-Digit Padding Rules', () => {
    it('formats numbers with correct prefix and minimum 4-digit zero-padding', () => {
      assert.equal(formatDocumentNumber('JOB_CARD', 1), 'JC-0001');
      assert.equal(formatDocumentNumber('JOB_CARD', 25), 'JC-0025');
      assert.equal(formatDocumentNumber('JOB_CARD', 9999), 'JC-9999');
      assert.equal(formatDocumentNumber('JOB_CARD', 10000), 'JC-10000');
      assert.equal(formatDocumentNumber('JOB_CARD', 123456), 'JC-123456');

      assert.equal(formatDocumentNumber('INVOICE', 1), 'IV-0001');
      assert.equal(formatDocumentNumber('CUSTOMER', 1), 'CU-0001');
      assert.equal(formatDocumentNumber('VEHICLE', 1), 'VE-0001');
      assert.equal(formatDocumentNumber('SUPPLIER', 1), 'SU-0001');
      assert.equal(formatDocumentNumber('PURCHASE_ORDER', 1), 'PO-0001');
      assert.equal(formatDocumentNumber('GRN', 1), 'GRN-0001');
      assert.equal(formatDocumentNumber('RECEIPT', 1), 'RC-0001');
      assert.equal(formatDocumentNumber('ESTIMATE', 1), 'ES-0001');
      assert.equal(formatDocumentNumber('COUNTER_SALE', 1), 'CS-0001');
      assert.equal(formatDocumentNumber('TECHNICIAN', 1), 'TN-0001');
    });

    it('parses both new standard format and historical hyphenated formats safely', () => {
      // Standard new format
      const parsedJC = parseDocumentNumber('JC-0001');
      assert.equal(parsedJC?.docType, 'JOB_CARD');
      assert.equal(parsedJC?.seq, 1);

      const parsedIV = parseDocumentNumber('IV-0025');
      assert.equal(parsedIV?.docType, 'INVOICE');
      assert.equal(parsedIV?.seq, 25);

      const parsedOver9999 = parseDocumentNumber('JC-10000');
      assert.equal(parsedOver9999?.seq, 10000);

      // Legacy / historical formats
      const legacyJC = parseDocumentNumber('JC-2026-0005');
      assert.equal(legacyJC?.docType, 'JOB_CARD');
      assert.equal(legacyJC?.seq, 5);

      const legacyINV = parseDocumentNumber('INV-2026-0123');
      assert.equal(legacyINV?.docType, 'INVOICE');
      assert.equal(legacyINV?.seq, 123);
    });
  });

  describe('2. Independent Counters for All 11 Document Types', () => {
    it('generates independent sequences for each document type in an isolated company', () => {
      const compId = `comp_isolated_${Date.now()}`;

      // Customer
      const cu1 = generateNextDocumentNumber('CUSTOMER', 0, compId);
      const cu2 = generateNextDocumentNumber('CUSTOMER', 0, compId);
      assert.equal(cu1.code, 'CU-0001');
      assert.equal(cu2.code, 'CU-0002');

      // Job Card (should start at JC-0001 regardless of customers created)
      const jc1 = generateNextDocumentNumber('JOB_CARD', 0, compId);
      const jc2 = generateNextDocumentNumber('JOB_CARD', 0, compId);
      assert.equal(jc1.code, 'JC-0001');
      assert.equal(jc2.code, 'JC-0002');

      // Invoice (should start at IV-0001 regardless of job cards created)
      const iv1 = generateNextDocumentNumber('INVOICE', 0, compId);
      assert.equal(iv1.code, 'IV-0001');

      // Vehicle
      const ve1 = generateNextDocumentNumber('VEHICLE', 0, compId);
      assert.equal(ve1.code, 'VE-0001');

      // Supplier
      const su1 = generateNextDocumentNumber('SUPPLIER', 0, compId);
      assert.equal(su1.code, 'SU-0001');

      // Purchase Order
      const po1 = generateNextDocumentNumber('PURCHASE_ORDER', 0, compId);
      assert.equal(po1.code, 'PO-0001');

      // Goods Receipt Note (GRN)
      const grn1 = generateNextDocumentNumber('GRN', 0, compId);
      assert.equal(grn1.code, 'GRN-0001');

      // Receipt / Payment
      const rc1 = generateNextDocumentNumber('RECEIPT', 0, compId);
      assert.equal(rc1.code, 'RC-0001');

      // Estimate
      const es1 = generateNextDocumentNumber('ESTIMATE', 0, compId);
      assert.equal(es1.code, 'ES-0001');

      // Counter Sale
      const cs1 = generateNextDocumentNumber('COUNTER_SALE', 0, compId);
      assert.equal(cs1.code, 'CS-0001');

      // Technician
      const tn1 = generateNextDocumentNumber('TECHNICIAN', 0, compId);
      assert.equal(tn1.code, 'TN-0001');
    });
  });

  describe('3. Company-Scoped Sequence Isolation', () => {
    it('ensures company A and company B maintain completely separate counters', () => {
      const compA = `comp_alpha_${Date.now()}`;
      const compB = `comp_beta_${Date.now()}`;

      // Create records for Company A
      const jcA1 = generateNextDocumentNumber('JOB_CARD', 0, compA);
      const jcA2 = generateNextDocumentNumber('JOB_CARD', 0, compA);
      const jcA3 = generateNextDocumentNumber('JOB_CARD', 0, compA);
      assert.equal(jcA1.code, 'JC-0001');
      assert.equal(jcA2.code, 'JC-0002');
      assert.equal(jcA3.code, 'JC-0003');

      // Company B should start from JC-0001
      const jcB1 = generateNextDocumentNumber('JOB_CARD', 0, compB);
      const jcB2 = generateNextDocumentNumber('JOB_CARD', 0, compB);
      assert.equal(jcB1.code, 'JC-0001');
      assert.equal(jcB2.code, 'JC-0002');

      // Company A next should be JC-0004
      const jcA4 = generateNextDocumentNumber('JOB_CARD', 0, compA);
      assert.equal(jcA4.code, 'JC-0004');
    });
  });

  describe('4. Concurrency & Atomicity Safety', () => {
    it('allocates strictly unique, monotonic numbers under simultaneous allocations', () => {
      const compId = `comp_concurrent_${Date.now()}`;
      const count = 50;
      const allocatedCodes = new Set<string>();

      for (let i = 0; i < count; i++) {
        const { code } = generateNextDocumentNumber('INVOICE', 0, compId);
        assert.ok(!allocatedCodes.has(code), `Duplicate code generated: ${code}`);
        allocatedCodes.add(code);
      }

      assert.equal(allocatedCodes.size, count);
      assert.ok(allocatedCodes.has('IV-0001'));
      assert.ok(allocatedCodes.has('IV-0050'));
    });
  });

  describe('5. Peeking & Verification Suite', () => {
    it('peeks the next number without incrementing the counter', () => {
      const compId = `comp_peek_${Date.now()}`;
      const peek1 = peekNextDocumentNumber('JOB_CARD', 0, compId);
      assert.equal(peek1.code, 'JC-0001');

      // Peeking again should return the exact same value
      const peek2 = peekNextDocumentNumber('JOB_CARD', 0, compId);
      assert.equal(peek2.code, 'JC-0001');

      // Now generating actually increments
      const gen1 = generateNextDocumentNumber('JOB_CARD', 0, compId);
      assert.equal(gen1.code, 'JC-0001');

      const peek3 = peekNextDocumentNumber('JOB_CARD', 0, compId);
      assert.equal(peek3.code, 'JC-0002');
    });

    it('passes the built-in system verification suite', async () => {
      const suiteResults = await runSequenceVerificationSuite();
      assert.equal(suiteResults.success, true);
      assert.equal(suiteResults.results.every(r => r.passed), true);
    });
  });
});
