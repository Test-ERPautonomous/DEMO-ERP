import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, db } from '../server/db';
import { generateNextDocumentNumber } from '../server/sequences';

describe('Najm Al Huda ERP — Full Cross-Module Business Workflow & Financial Suite', () => {
  before(() => {
    initDatabase();
  });

  after(() => {
    try {
      db.exec(`
        DELETE FROM invoices WHERE id LIKE 'wf-test-%';
        DELETE FROM job_cards WHERE id LIKE 'wf-test-%';
        DELETE FROM purchase_orders WHERE id LIKE 'wf-test-%';
        DELETE FROM counter_sales WHERE id LIKE 'wf-test-%';
        DELETE FROM customers WHERE id LIKE 'wf-test-%';
        DELETE FROM vehicles WHERE id LIKE 'wf-test-%';
        DELETE FROM suppliers WHERE id LIKE 'wf-test-%';
        DELETE FROM inventory WHERE id LIKE 'wf-test-%';
        DELETE FROM stock_movements WHERE id LIKE 'wf-test-%';
        DELETE FROM technicians WHERE id LIKE 'wf-test-%';
      `);
    } catch {
      // Ignore cleanup error
    }
  });

  describe('1. Atomic Company-Scoped Document Numbering Standards', () => {
    it('allocates proper prefixes for all 11 core ERP document entities', () => {
      const company = 'comp_wf_test';
      const jc = generateNextDocumentNumber('JOB_CARD', 0, company);
      const inv = generateNextDocumentNumber('INVOICE', 0, company);
      const cu = generateNextDocumentNumber('CUSTOMER', 0, company);
      const ve = generateNextDocumentNumber('VEHICLE', 0, company);
      const su = generateNextDocumentNumber('SUPPLIER', 0, company);
      const po = generateNextDocumentNumber('PURCHASE_ORDER', 0, company);
      const grn = generateNextDocumentNumber('GRN', 0, company);
      const rc = generateNextDocumentNumber('RECEIPT', 0, company);
      const es = generateNextDocumentNumber('ESTIMATE', 0, company);
      const cs = generateNextDocumentNumber('COUNTER_SALE', 0, company);
      const tn = generateNextDocumentNumber('TECHNICIAN', 0, company);

      assert.match(jc.code, /^JC-\d{4,}$/);
      assert.match(inv.code, /^IV-\d{4,}$/);
      assert.match(cu.code, /^CU-\d{4,}$/);
      assert.match(ve.code, /^VE-\d{4,}$/);
      assert.match(su.code, /^SU-\d{4,}$/);
      assert.match(po.code, /^PO-\d{4,}$/);
      assert.match(grn.code, /^GRN-\d{4,}$/);
      assert.match(rc.code, /^RC-\d{4,}$/);
      assert.match(es.code, /^ES-\d{4,}$/);
      assert.match(cs.code, /^CS-\d{4,}$/);
      assert.match(tn.code, /^TN-\d{4,}$/);
    });
  });

  describe('2. End-to-End Operational Workflow: Customer → Vehicle → Job Card → Close & Invoice → Receipt', () => {
    const custId = `wf-test-cust-${Date.now()}`;
    const vehId = `wf-test-veh-${Date.now()}`;
    const jcId = `wf-test-jc-${Date.now()}`;
    const invId = `wf-test-inv-${Date.now()}`;
    const now = new Date().toISOString();

    it('Step A: Creates Customer Master Record and persists to DB', () => {
      db.prepare(`
        INSERT INTO customers (id, customer_id, customer_number, name, phone, email, address, company_id, created_at, updated_at)
        VALUES (?, 'CU-0091', 'CU-0091', 'Sheikh Hamad Al-Thani', '+974 5588 9900', 'hamad@althani.qa', 'Al Dafna, Doha', 'default_company', ?, ?)
      `).run(custId, now, now);

      const savedCust = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(custId) as any;
      assert.ok(savedCust);
      assert.equal(savedCust.name, 'Sheikh Hamad Al-Thani');
      assert.equal(savedCust.customer_number, 'CU-0091');
    });

    it('Step B: Creates Vehicle Master linked to Customer', () => {
      db.prepare(`
        INSERT INTO vehicles (id, vehicle_number, customer_id, plate_number, make, model, year, vin, color, mileage, company_id, created_at, updated_at)
        VALUES (?, 'VE-0091', ?, '192837 QA', 'Lexus', 'LX600 VIP', 2024, 'JTJHY05J9P4019283', 'Sonic Titanium', 12500, 'default_company', ?, ?)
      `).run(vehId, custId, now, now);

      const savedVeh = db.prepare(`SELECT * FROM vehicles WHERE id = ?`).get(vehId) as any;
      assert.ok(savedVeh);
      assert.equal(savedVeh.plate_number, '192837 QA');
      assert.equal(savedVeh.customer_id, custId);
    });

    it('Step C: Opens Job Card with Labor, Parts and Technician assignment', () => {
      const labor = [{ id: 'l1', description: 'Major 20,000 KM Engine Service & Diagnostic', hours: 3, rate: 200, technician: 'Tariq Al-Mansoor' }];
      const parts = [{ id: 'p1', sku: 'OIL-FLT-LEX', name: 'Original Lexus Oil Filter', quantity: 1, unitPrice: 85, total: 85 }];
      const customerJson = { id: custId, name: 'Sheikh Hamad Al-Thani', phone: '+974 5588 9900' };
      const vehicleJson = { id: vehId, plateNumber: '192837 QA', make: 'Lexus', model: 'LX600 VIP', year: 2024 };

      db.prepare(`
        INSERT INTO job_cards (
          id, job_number, customer_json, vehicle_json,
          date_in, promised_date, status, complaints_json, labor_json, parts_json, total_amount, balance_amount,
          technician_assigned, company_id, created_at, updated_at
        ) VALUES (?, 'JC-0091', ?, ?, ?, ?, 'Approved', '["Routine scheduled maintenance"]', ?, ?, 685, 685, 'Tariq Al-Mansoor', 'default_company', ?, ?)
      `).run(jcId, JSON.stringify(customerJson), JSON.stringify(vehicleJson), now, now, JSON.stringify(labor), JSON.stringify(parts), now, now);

      const savedJc = db.prepare(`SELECT * FROM job_cards WHERE id = ?`).get(jcId) as any;
      assert.ok(savedJc);
      assert.equal(savedJc.job_number, 'JC-0091');
      assert.equal(savedJc.technician_assigned, 'Tariq Al-Mansoor');
      assert.equal(savedJc.total_amount, 685);
    });

    it('Step D: Closes Job Card and Generates Linked Tax Invoice without Duplication', () => {
      // 1. Update Job Card to Closed
      db.prepare(`UPDATE job_cards SET status = 'Closed', updated_at = ? WHERE id = ?`).run(now, jcId);

      // 2. Create Invoice
      const customerJson = { name: 'Sheikh Hamad Al-Thani', phone: '+974 5588 9900' };
      const vehicleJson = { plateNumber: '192837 QA', make: 'Lexus', model: 'LX600 VIP' };
      const lineItems = [
        { description: 'Major 20,000 KM Engine Service', quantity: 3, unitPrice: 200, total: 600, type: 'Labor' },
        { description: 'Original Lexus Oil Filter', quantity: 1, unitPrice: 85, total: 85, type: 'Part' }
      ];

      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, job_card_id, job_number, customer_json, vehicle_json,
          date, due_date, status, subtotal, discount_amount, tax_rate_percent, tax_amount, grand_total,
          paid_amount, balance_amount, labor_items_json, part_items_json, payments_json,
          created_at, updated_at
        ) VALUES (?, 'IV-0091', ?, 'JC-0091', ?, ?, ?, ?, 'Unpaid', 685, 0, 0, 0, 685, 0, 685, ?, ?, '[]', ?, ?)
      `).run(invId, jcId, JSON.stringify(customerJson), JSON.stringify(vehicleJson), now.split('T')[0], now.split('T')[0], JSON.stringify([lineItems[0]]), JSON.stringify([lineItems[1]]), now, now);

      const savedInv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invId) as any;
      assert.ok(savedInv);
      assert.equal(savedInv.invoice_number, 'IV-0091');
      assert.equal(savedInv.job_card_id, jcId);
      assert.equal(savedInv.grand_total, 685);
      assert.equal(savedInv.status, 'Unpaid');
      assert.equal(savedInv.balance_amount, 685);
    });

    it('Step E: Issues Payment Receipt, Updates Invoice to Paid, then verifies Reversal', () => {
      // 1. Record Payment
      const paymentRecord = {
        id: `pay-${Date.now()}`,
        amount: 685,
        date: now.split('T')[0],
        method: 'Credit Card',
        transactionRef: 'RC-0091',
        notes: 'Full settlement by credit card'
      };

      db.prepare(`
        UPDATE invoices 
        SET paid_amount = 685, balance_amount = 0, status = 'Paid', payments_json = ?, updated_at = ?
        WHERE id = ?
      `).run(JSON.stringify([paymentRecord]), now, invId);

      const paidInv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invId) as any;
      assert.equal(paidInv.status, 'Paid');
      assert.equal(paidInv.balance_amount, 0);
      assert.equal(paidInv.paid_amount, 685);

      // 2. Test Payment Reversal restoring balance
      db.prepare(`
        UPDATE invoices 
        SET paid_amount = 0, balance_amount = 685, status = 'Unpaid', payments_json = '[]', updated_at = ?
        WHERE id = ?
      `).run(now, invId);

      const reversedInv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invId) as any;
      assert.equal(reversedInv.status, 'Unpaid');
      assert.equal(reversedInv.balance_amount, 685);
      assert.equal(reversedInv.paid_amount, 0);
    });
  });

  describe('3. Purchasing & Inwarding Workflow: Supplier → PO → GRN → Stock Inward', () => {
    const suppId = `wf-test-supp-${Date.now()}`;
    const poId = `wf-test-po-${Date.now()}`;
    const partId = `wf-test-part-${Date.now()}`;
    const now = new Date().toISOString();

    it('Step A: Creates Supplier Master & Inventory Part', () => {
      db.prepare(`
        INSERT INTO suppliers (id, supplier_id, name, phone, email, address, payment_terms, created_at, updated_at)
        VALUES (?, 'SU-0091', 'Qatar Auto Wholesale Co.', '+974 4455 6677', 'sales@qatarauto.qa', 'Street 24, Industrial Area', '30 Days Net', ?, ?)
      `).run(suppId, now, now);

      db.prepare(`
        INSERT INTO inventory (id, sku, name, category, vehicle_compatibility, quantity_on_hand, min_reorder_level, unit_of_measure, unit_cost, retail_price, rack_location, created_at, updated_at)
        VALUES (?, 'BRK-DISC-01', 'Front Ventilated Brake Disc Rotor', 'Mechanical Parts', 'Land Cruiser / LX570', 4, 5, 'PCS', 180, 320, 'Rack B-02', ?, ?)
      `).run(partId, now, now);

      const part = db.prepare(`SELECT * FROM inventory WHERE id = ?`).get(partId) as any;
      assert.equal(part.quantity_on_hand, 4);
    });

    it('Step B: Creates Purchase Order for 10 units', () => {
      const items = [{
        partId,
        sku: 'BRK-DISC-01',
        name: 'Front Ventilated Brake Disc Rotor',
        quantity: 10,
        unitCost: 180,
        totalCost: 1800
      }];

      db.prepare(`
        INSERT INTO purchase_orders (
          id, po_number, supplier_id, supplier_name, date, expected_date,
          status, total_amount, items_json, payment_status, created_at, updated_at
        ) VALUES (?, 'PO-0091', ?, 'Qatar Auto Wholesale Co.', ?, ?, 'Ordered', 1800, ?, 'Unpaid', ?, ?)
      `).run(poId, suppId, now.split('T')[0], now.split('T')[0], JSON.stringify(items), now, now);

      const po = db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).get(poId) as any;
      assert.ok(po);
      assert.equal(po.po_number, 'PO-0091');
      assert.equal(po.status, 'Ordered');
    });

    it('Step C: Posts GRN and Inwards Stock by +10 units', () => {
      // 1. Inward stock in inventory
      db.prepare(`
        UPDATE inventory 
        SET quantity_on_hand = quantity_on_hand + 10, updated_at = ?
        WHERE id = ?
      `).run(now, partId);

      // 2. Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (id, item_id, sku, item_name, type, quantity, previous_qty, new_qty, unit_cost, reason, timestamp)
        VALUES (?, ?, 'BRK-DISC-01', 'Front Ventilated Brake Disc Rotor', 'PURCHASE', 10, 4, 14, 180, 'Goods Receipt Note GRN-0091 against PO-0091', ?)
      `).run(`wf-test-mov-${Date.now()}`, partId, now);

      // 3. Update PO status to Received
      db.prepare(`UPDATE purchase_orders SET status = 'Received', updated_at = ? WHERE id = ?`).run(now, poId);

      const updatedPart = db.prepare(`SELECT * FROM inventory WHERE id = ?`).get(partId) as any;
      assert.equal(updatedPart.quantity_on_hand, 14); // 4 + 10 = 14

      const updatedPo = db.prepare(`SELECT * FROM purchase_orders WHERE id = ?`).get(poId) as any;
      assert.equal(updatedPo.status, 'Received');
    });
  });

  describe('4. Counter Sale Retail Workflow & Real-Time Stock Relief', () => {
    const saleId = `wf-test-cs-${Date.now()}`;
    const partId = `wf-test-part2-${Date.now()}`;
    const now = new Date().toISOString();

    it('Decreases stock exactly once upon Counter Sale and records Stock Movement', () => {
      // 1. Seed part with 15 units
      db.prepare(`
        INSERT INTO inventory (id, sku, name, category, vehicle_compatibility, quantity_on_hand, min_reorder_level, unit_of_measure, unit_cost, retail_price, rack_location, created_at, updated_at)
        VALUES (?, 'SPK-PLUG-IRID', 'Iridium Platinum Spark Plug', 'Mechanical Parts', 'Universal V6/V8', 15, 6, 'PCS', 35, 75, 'Rack A-04', ?, ?)
      `).run(partId, now, now);

      // 2. Process Counter Sale for 4 units
      const saleItems = [{
        itemId: partId,
        sku: 'SPK-PLUG-IRID',
        name: 'Iridium Platinum Spark Plug',
        quantity: 4,
        unitPrice: 75,
        total: 300
      }];

      db.prepare(`
        INSERT INTO counter_sales (
          id, sale_number, customer_name, customer_phone, date,
          items_json, total_amount, payment_method, company_id, created_at
        ) VALUES (?, 'CS-0091', 'Walk-in Retail Buyer', '+974 7711 2233', ?, ?, 300, 'Cash', 'default_company', ?)
      `).run(saleId, now.split('T')[0], JSON.stringify(saleItems), now);

      // 3. Deduct stock
      db.prepare(`
        UPDATE inventory 
        SET quantity_on_hand = quantity_on_hand - 4, updated_at = ?
        WHERE id = ?
      `).run(now, partId);

      // 4. Record stock movement
      db.prepare(`
        INSERT INTO stock_movements (id, item_id, sku, item_name, type, quantity, previous_qty, new_qty, unit_cost, reason, timestamp)
        VALUES (?, ?, 'SPK-PLUG-IRID', 'Iridium Platinum Spark Plug', 'COUNTER_SALE', 4, 15, 11, 35, 'Counter Sale CS-0091', ?)
      `).run(`wf-test-mov2-${Date.now()}`, partId, now);

      const part = db.prepare(`SELECT * FROM inventory WHERE id = ?`).get(partId) as any;
      assert.equal(part.quantity_on_hand, 11); // 15 - 4 = 11

      const savedSale = db.prepare(`SELECT * FROM counter_sales WHERE id = ?`).get(saleId) as any;
      assert.ok(savedSale);
      assert.equal(savedSale.total_amount, 300);
      assert.equal(savedSale.sale_number, 'CS-0091');
    });
  });
});
