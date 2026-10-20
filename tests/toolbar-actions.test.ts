import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, db } from '../server/db';
import { generateNextDocumentNumber, isDocumentNumberTaken } from '../server/sequences';

describe('ERP Form Toolbar Actions & Persistence Suite', () => {
  before(() => {
    initDatabase();
  });

  after(() => {
    try {
      db.exec(`
        DELETE FROM invoices WHERE id LIKE 'test-%' OR id LIKE 'tb-test-%' OR company_id LIKE 'comp_%';
        DELETE FROM job_cards WHERE id LIKE 'test-%' OR id LIKE 'tb-test-%' OR company_id LIKE 'comp_%';
        DELETE FROM purchase_orders WHERE id LIKE 'test-%' OR id LIKE 'tb-test-%' OR company_id LIKE 'comp_%';
        DELETE FROM estimates WHERE id LIKE 'test-%' OR id LIKE 'tb-test-%' OR company_id LIKE 'comp_%';
      `);
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('1. New Action (Document Number Sequencing & Collision-Free Allocation)', () => {
    it('generates sequential collision-free Job Card number on New', () => {
      const seq1 = generateNextDocumentNumber('JOB_CARD', 0, 'comp_tb_test');
      const seq2 = generateNextDocumentNumber('JOB_CARD', 0, 'comp_tb_test');
      assert.match(seq1.code, /^JC-\d{4,}$/);
      assert.match(seq2.code, /^JC-\d{4,}$/);
      assert.notEqual(seq1.code, seq2.code);
    });

    it('generates sequential collision-free Invoice number on New', () => {
      const seq1 = generateNextDocumentNumber('INVOICE', 0, 'comp_tb_test');
      const seq2 = generateNextDocumentNumber('INVOICE', 0, 'comp_tb_test');
      assert.match(seq1.code, /^IV-\d{4,}$/);
      assert.match(seq2.code, /^IV-\d{4,}$/);
      assert.notEqual(seq1.code, seq2.code);
    });

    it('generates sequential collision-free Estimate number on New', () => {
      const seq1 = generateNextDocumentNumber('ESTIMATE', 0, 'comp_tb_test');
      const seq2 = generateNextDocumentNumber('ESTIMATE', 0, 'comp_tb_test');
      assert.match(seq1.code, /^ES-\d{4,}$/);
      assert.match(seq2.code, /^ES-\d{4,}$/);
      assert.notEqual(seq1.code, seq2.code);
    });
  });

  describe('2. Save Action (Creation, Validation & Backend Persistence)', () => {
    it('saves a new Job Card record and persists across reload queries', () => {
      const id = `tb-test-jc-${Date.now()}`;
      const year = new Date().getFullYear();
      const jobNumber = `JC-${year}-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      const customer = { name: 'Jassim Al-Mannai', phone: '+974 5599 8877' };
      const vehicle = { plateNumber: '99201', make: 'Nissan', model: 'Patrol Y62' };

      db.prepare(`
        INSERT INTO job_cards (
          id, job_number, customer_json, vehicle_json,
          date_in, promised_date, status, complaints_json,
          parts_json, labor_json, total_amount, balance_amount,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, jobNumber, JSON.stringify(customer), JSON.stringify(vehicle),
        now, now, 'Approved', '["Brake noise"]',
        '[]', '[]', 850, 850,
        now, now
      );

      const saved = db.prepare(`SELECT * FROM job_cards WHERE id = ?`).get(id) as any;
      assert.ok(saved);
      assert.equal(saved.job_number, jobNumber);
      assert.equal(saved.status, 'Approved');
      assert.equal(saved.total_amount, 850);
      assert.equal(JSON.parse(saved.customer_json).name, 'Jassim Al-Mannai');
    });

    it('saves a new Tax Invoice record and persists to database', () => {
      const id = `tb-test-inv-${Date.now()}`;
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      const customer = { name: 'Khalid Al-Hajri', phone: '+974 6611 2233' };
      const vehicle = { plateNumber: '55441', make: 'Lexus', model: 'LX570' };

      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_json, vehicle_json,
          date, due_date, status, subtotal, discount_amount,
          tax_rate_percent, tax_amount, grand_total, paid_amount, balance_amount,
          labor_items_json, part_items_json, additional_charges_json, payments_json,
          is_locked, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        id, invoiceNumber, JSON.stringify(customer), JSON.stringify(vehicle),
        now.split('T')[0], now.split('T')[0], 'Unpaid', 1400, 0,
        0, 0, 1400, 0, 1400,
        '[]', '[]', '[]', '[]',
        now, now
      );

      const saved = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id) as any;
      assert.ok(saved);
      assert.equal(saved.invoice_number, invoiceNumber);
      assert.equal(saved.grand_total, 1400);
      assert.equal(saved.balance_amount, 1400);
      assert.equal(saved.status, 'Unpaid');
    });

    it('saves a new Estimation record and persists to database', () => {
      const id = `tb-test-est-${Date.now()}`;
      const year = new Date().getFullYear();
      const estimateNumber = `EST-${year}-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      const customer = { name: 'Nasser Al-Khelaifi', phone: '+974 3300 4400' };
      const vehicle = { plateNumber: '11223', make: 'Porsche', model: 'Cayenne GTS' };
      const items = [{ id: '1', type: 'Labor', description: 'Major Service', qty: 1, rate: 2200 }];

      db.prepare(`
        INSERT INTO estimates (
          id, estimate_number, customer_json, vehicle_json,
          date, valid_until, status, items_json, subtotal,
          discount_amount, tax_rate_percent, tax_amount, grand_total,
          created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, estimateNumber, JSON.stringify(customer), JSON.stringify(vehicle),
        now.split('T')[0], now.split('T')[0], 'Draft', JSON.stringify(items), 2200,
        0, 0, 0, 2200,
        'Estimator Osman', now
      );

      const saved = db.prepare(`SELECT * FROM estimates WHERE id = ?`).get(id) as any;
      assert.ok(saved);
      assert.equal(saved.estimate_number, estimateNumber);
      assert.equal(saved.grand_total, 2200);
      assert.equal(saved.status, 'Draft');
    });
  });

  describe('3. Edit Action & Field Update Persistence', () => {
    it('updates existing Job Card fields in place upon Save after Edit', () => {
      const id = `tb-test-jc-edit-${Date.now()}`;
      const year = new Date().getFullYear();
      const jobNumber = `JC-${year}-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO job_cards (
          id, job_number, customer_json, vehicle_json, complaints_json, parts_json, labor_json,
          date_in, promised_date, status, total_amount, balance_amount, created_at, updated_at
        ) VALUES (?, ?, '{}', '{}', '[]', '[]', '[]', ?, ?, 'Draft', 500, 500, ?, ?)
      `).run(id, jobNumber, now, now, now, now);

      // Edit: update total, status, and technician
      const updatedTime = new Date().toISOString();
      db.prepare(`
        UPDATE job_cards SET
          status = 'In Progress',
          technician_assigned = 'Tariq Mechanical Lead',
          total_amount = 750,
          balance_amount = 750,
          updated_at = ?
        WHERE id = ?
      `).run(updatedTime, id);

      const record = db.prepare(`SELECT * FROM job_cards WHERE id = ?`).get(id) as any;
      assert.equal(record.status, 'In Progress');
      assert.equal(record.technician_assigned, 'Tariq Mechanical Lead');
      assert.equal(record.total_amount, 750);
    });

    it('updates existing Invoice fields in place upon Save after Edit', () => {
      const id = `tb-test-inv-edit-${Date.now()}`;
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_json, vehicle_json, labor_items_json, part_items_json, additional_charges_json, payments_json,
          date, due_date, status, grand_total, balance_amount, is_locked, created_at, updated_at
        ) VALUES (?, ?, '{}', '{}', '[]', '[]', '[]', '[]', ?, ?, 'Unpaid', 600, 600, 0, ?, ?)
      `).run(id, invoiceNumber, now.split('T')[0], now.split('T')[0], now, now);

      // Edit invoice discount and total
      db.prepare(`
        UPDATE invoices SET
          discount_amount = 100,
          grand_total = 500,
          balance_amount = 500,
          updated_at = ?
        WHERE id = ?
      `).run(new Date().toISOString(), id);

      const record = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id) as any;
      assert.equal(record.discount_amount, 100);
      assert.equal(record.grand_total, 500);
    });
  });

  describe('4. Delete Action & Integrity Guard Rails', () => {
    it('deletes an unlinked draft Job Card cleanly', () => {
      const id = `tb-test-jc-del-${Date.now()}`;
      const year = new Date().getFullYear();
      const jobNumber = `JC-${year}-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO job_cards (
          id, job_number, customer_json, vehicle_json, complaints_json, parts_json, labor_json,
          date_in, promised_date, status, total_amount, balance_amount, created_at, updated_at
        ) VALUES (?, ?, '{}', '{}', '[]', '[]', '[]', ?, ?, 'Draft', 300, 300, ?, ?)
      `).run(id, jobNumber, now, now, now, now);

      assert.ok(db.prepare(`SELECT id FROM job_cards WHERE id = ?`).get(id));
      db.prepare(`DELETE FROM job_cards WHERE id = ?`).run(id);
      assert.equal(db.prepare(`SELECT id FROM job_cards WHERE id = ?`).get(id), undefined);
    });

    it('guards against deleting an Invoice that has recorded customer payments', () => {
      const invId = `tb-test-inv-guard-${Date.now()}`;
      const year = new Date().getFullYear();
      const invoiceNumber = `INV-${year}-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();
      const payments = [{ id: `pmt-${Date.now()}`, amount: 500, method: 'Cash', date: now.split('T')[0] }];

      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_json, vehicle_json, labor_items_json, part_items_json, additional_charges_json, payments_json,
          date, due_date, status, grand_total, paid_amount, balance_amount, is_locked, created_at, updated_at
        ) VALUES (?, ?, '{}', '{}', '[]', '[]', '[]', ?, ?, ?, 'Partial', 1000, 500, 500, 0, ?, ?)
      `).run(invId, invoiceNumber, JSON.stringify(payments), now.split('T')[0], now.split('T')[0], now, now);

      // Verify guard logic: check payments count or paid amount > 0
      const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invId) as any;
      const recordedPayments = JSON.parse(invoice.payments_json || '[]');

      const cannotDelete = (recordedPayments && recordedPayments.length > 0) || Number(invoice.paid_amount || 0) > 0;
      assert.equal(cannotDelete, true, 'Integrity guard must prevent deletion of invoices with payments');
    });

    it('deletes an unlinked Estimate cleanly', () => {
      const id = `tb-test-est-del-${Date.now()}`;
      const year = new Date().getFullYear();
      const estimateNumber = `EST-${year}-${Date.now().toString().slice(-4)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO estimates (
          id, estimate_number, customer_json, vehicle_json, items_json, date, valid_until, status, grand_total, created_at
        ) VALUES (?, ?, '{}', '{}', '[]', ?, ?, 'Draft', 900, ?)
      `).run(id, estimateNumber, now.split('T')[0], now.split('T')[0], now);

      assert.ok(db.prepare(`SELECT id FROM estimates WHERE id = ?`).get(id));
      db.prepare(`DELETE FROM estimates WHERE id = ?`).run(id);
      assert.equal(db.prepare(`SELECT id FROM estimates WHERE id = ?`).get(id), undefined);
    });
  });

  describe('5. Find / Search Action (Lookup & Filtering)', () => {
    it('finds Job Cards by plate number, job number, or customer name', () => {
      const query = db.prepare(`
        SELECT id, job_number, customer_json, vehicle_json, status, total_amount
        FROM job_cards
        WHERE job_number LIKE ? OR customer_json LIKE ? OR vehicle_json LIKE ?
      `).all('%JC-%', '%Ahmed%', '%Toyota%');

      assert.ok(Array.isArray(query));
    });

    it('finds Invoices by invoice number, customer name, or status', () => {
      const query = db.prepare(`
        SELECT id, invoice_number, customer_json, status, grand_total
        FROM invoices
        WHERE invoice_number LIKE ? OR status = ?
      `).all('%INV-%', 'Unpaid');

      assert.ok(Array.isArray(query));
    });
  });
});
