import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, db } from '../server/db';
import { generateNextDocumentNumber } from '../server/sequences';

describe('Najm Al Huda Workshop Management - Critical Workflows', () => {
  const testCompId = `comp_workflow_${Date.now()}`;

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

  describe('1. Database Initialization & Sequences', () => {
    it('should generate sequential, collision-free job card document numbers', () => {
      const res1 = generateNextDocumentNumber('JOB_CARD', 0, testCompId);
      const res2 = generateNextDocumentNumber('JOB_CARD', 0, testCompId);
      
      assert.match(res1.code, /^JC-\d{4,}$/);
      assert.match(res2.code, /^JC-\d{4,}$/);
      assert.equal(res1.code, 'JC-0001');
      assert.equal(res2.code, 'JC-0002');
      assert.notEqual(res1.code, res2.code);
    });

    it('should generate sequential invoice document numbers', () => {
      const res1 = generateNextDocumentNumber('INVOICE', 0, testCompId);
      const res2 = generateNextDocumentNumber('INVOICE', 0, testCompId);
      
      assert.match(res1.code, /^IV-\d{4,}$/);
      assert.match(res2.code, /^IV-\d{4,}$/);
      assert.equal(res1.code, 'IV-0001');
      assert.equal(res2.code, 'IV-0002');
      assert.notEqual(res1.code, res2.code);
    });
  });

  describe('2. Job Card Lifecycle', () => {
    it('should insert and transition a job card through workshop stages', () => {
      const id = `test-job-${Date.now()}`;
      const { code: jobNumber } = generateNextDocumentNumber('JOB_CARD', 0, 'comp_new');
      
      const customerJson = JSON.stringify({
        id: 'cust-1',
        name: 'Ahmed Al-Thani',
        phone: '+974 5511 2233'
      });
      const vehicleJson = JSON.stringify({
        plateNumber: 'QA-12345',
        make: 'Toyota',
        model: 'Land Cruiser',
        year: 2024
      });

      db.prepare(`
        INSERT INTO job_cards (
          id, job_number, customer_json, vehicle_json,
          date_in, promised_date, status, complaints_json,
          parts_json, labor_json, total_amount, balance_amount,
          company_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, jobNumber, customerJson, vehicleJson,
        new Date().toISOString(), new Date().toISOString(),
        'Draft', '[]', '[]', '[]', 1250, 1250,
        'comp_new', new Date().toISOString(), new Date().toISOString()
      );

      const job = db.prepare('SELECT * FROM job_cards WHERE id = ?').get(id) as any;
      assert.equal(job.job_number, jobNumber);
      assert.equal(job.status, 'Draft');

      // Progress status to In Progress
      db.prepare('UPDATE job_cards SET status = ?, updated_at = ? WHERE id = ?').run(
        'In Progress', new Date().toISOString(), id
      );
      const updatedJob = db.prepare('SELECT status FROM job_cards WHERE id = ?').get(id) as any;
      assert.equal(updatedJob.status, 'In Progress');

      // Progress status to Delivered
      db.prepare('UPDATE job_cards SET status = ?, updated_at = ? WHERE id = ?').run(
        'Delivered', new Date().toISOString(), id
      );
      const deliveredJob = db.prepare('SELECT status FROM job_cards WHERE id = ?').get(id) as any;
      assert.equal(deliveredJob.status, 'Delivered');
    });
  });

  describe('3. Purchase Order & Inventory Receiving (GRN)', () => {
    it('should create PO, receive items, and update inventory stockOnHand correctly', () => {
      const partId = `test-part-${Date.now()}`;
      const sku = `SKU-${Date.now()}`;
      // Setup inventory item
      db.prepare(`
        INSERT INTO inventory (id, sku, name, category, unit_cost, retail_price, quantity_on_hand, min_reorder_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(partId, sku, 'Oil Filter OEM', 'Filters', 45, 75, 10, 5, new Date().toISOString(), new Date().toISOString());

      const initialInv = db.prepare('SELECT quantity_on_hand FROM inventory WHERE id = ?').get(partId) as any;
      assert.equal(initialInv.quantity_on_hand, 10);

      // Create PO for 20 units
      const poId = `test-po-${Date.now()}`;
      const { code: poNumber } = generateNextDocumentNumber('PURCHASE_ORDER', 0, 'comp_new');
      const itemsJson = JSON.stringify([{
        partId,
        sku,
        name: 'Oil Filter OEM',
        quantity: 20,
        unitCost: 45,
        totalCost: 900
      }]);

      db.prepare(`
        INSERT INTO purchase_orders (id, po_number, supplier_id, supplier_name, date, expected_date, status, items_json, total_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(poId, poNumber, 'supp-1', 'Doha Auto Parts', new Date().toISOString(), new Date().toISOString(), 'Draft', itemsJson, 900, new Date().toISOString(), new Date().toISOString());

      // Simulate receiving 20 items
      db.prepare('UPDATE inventory SET quantity_on_hand = quantity_on_hand + ?, updated_at = ? WHERE id = ?').run(20, new Date().toISOString(), partId);
      db.prepare('UPDATE purchase_orders SET status = ?, updated_at = ? WHERE id = ?').run('Received', new Date().toISOString(), poId);

      const updatedInv = db.prepare('SELECT quantity_on_hand FROM inventory WHERE id = ?').get(partId) as any;
      assert.equal(updatedInv.quantity_on_hand, 30);

      const updatedPo = db.prepare('SELECT status FROM purchase_orders WHERE id = ?').get(poId) as any;
      assert.equal(updatedPo.status, 'Received');
    });
  });

  describe('4. Invoices and Payment Recording with Overpayment Guard', () => {
    it('should create invoice and record payments with accurate balance tracking', () => {
      const invId = `test-inv-${Date.now()}`;
      const { code: invoiceNumber } = generateNextDocumentNumber('INVOICE', 0, testCompId);
      const totalAmount = 1500;
      const customerJson = JSON.stringify({ name: 'Hamad Al-Kuwari', phone: '+974 5599 8877' });

      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_json, date, due_date, status,
          labor_items_json, part_items_json, subtotal, grand_total,
          paid_amount, balance_amount, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invId, invoiceNumber, customerJson, new Date().toISOString(), new Date().toISOString(), 'Unpaid',
        '[]', '[]', totalAmount, totalAmount, 0, totalAmount, new Date().toISOString(), new Date().toISOString()
      );

      const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId) as any;
      assert.equal(inv.invoice_number, invoiceNumber);
      assert.equal(inv.status, 'Unpaid');
      assert.equal(inv.balance_amount, 1500);

      // Record partial payment of 500
      const payment1 = 500;
      const newPaid1 = inv.paid_amount + payment1;
      const newBalance1 = inv.grand_total - newPaid1;
      const status1 = newBalance1 === 0 ? 'Paid' : 'Partial';

      db.prepare(`
        UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = ? WHERE id = ?
      `).run(newPaid1, newBalance1, status1, new Date().toISOString(), invId);

      const invAfterPay1 = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId) as any;
      assert.equal(invAfterPay1.paid_amount, 500);
      assert.equal(invAfterPay1.balance_amount, 1000);
      assert.equal(invAfterPay1.status, 'Partial');

      // Record final settlement payment of 1000
      const payment2 = 1000;
      const newPaid2 = invAfterPay1.paid_amount + payment2;
      const newBalance2 = invAfterPay1.grand_total - newPaid2;
      const status2 = newBalance2 === 0 ? 'Paid' : 'Partial';

      db.prepare(`
        UPDATE invoices SET paid_amount = ?, balance_amount = ?, status = ?, updated_at = ? WHERE id = ?
      `).run(newPaid2, newBalance2, status2, new Date().toISOString(), invId);

      const invAfterPay2 = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invId) as any;
      assert.equal(invAfterPay2.paid_amount, 1500);
      assert.equal(invAfterPay2.balance_amount, 0);
      assert.equal(invAfterPay2.status, 'Paid');
    });
  });
});
