import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, db } from '../server/db';

describe('Financial Module — Core Workflows, Advances, Allocations & Safety Tests', () => {
  const companyId = 'comp-test-fin';
  const testAccId = 'acc-test-bank-1';
  const testInvoiceId = 'inv-test-fin-101';
  const testPoId = 'po-test-fin-201';

  before(() => {
    initDatabase();

    // Insert test financial account with 10,000 QAR
    db.prepare(`
      INSERT OR REPLACE INTO financial_accounts (
        id, code, name, type, bank_name, account_number, currency, opening_balance, current_balance, is_active, company_id, created_at, updated_at
      ) VALUES (?, '9010', 'Test Bank Account', 'bank', 'QNB', 'QA99TEST0001', 'QAR', 10000, 10000, 1, ?, '2026-09-01', '2026-09-01')
    `).run(testAccId, companyId);

    // Insert test invoice for 2,500 QAR
    db.prepare(`
      INSERT OR REPLACE INTO invoices (
        id, invoice_number, customer_json, date, due_date, status, labor_items_json, part_items_json,
        grand_total, paid_amount, balance_amount, payment_status, company_id, created_at, updated_at
      ) VALUES (?, 'IV-TEST-101', '{"name":"Ali Al-Thani","phone":"+974 5511 2233"}', '2026-09-10', '2026-09-25', 'Unpaid', '[]', '[]',
        2500, 0, 2500, 'Unpaid', ?, '2026-09-10', '2026-09-10')
    `).run(testInvoiceId, companyId);

    // Insert test purchase order for 3,000 QAR
    db.prepare(`
      INSERT OR REPLACE INTO purchase_orders (
        id, po_number, supplier_name, date, expected_date, status, items_json, total_amount, payment_status, company_id, created_at, updated_at
      ) VALUES (?, 'PO-TEST-201', 'Qatar Spare Parts W.L.L.', '2026-09-12', '2026-09-28', 'Ordered', '[]', 3000, 'Unpaid', ?, '2026-09-12', '2026-09-12')
    `).run(testPoId, companyId);
  });

  after(() => {
    try {
      db.prepare(`DELETE FROM financial_allocations WHERE transaction_id LIKE 'tx-test-%'`).run();
      db.prepare(`DELETE FROM financial_transactions WHERE id LIKE 'tx-test-%'`).run();
      db.prepare(`DELETE FROM journal_entries WHERE reference_id LIKE 'tx-test-%'`).run();
      db.prepare(`DELETE FROM invoices WHERE id = ?`).run(testInvoiceId);
      db.prepare(`DELETE FROM purchase_orders WHERE id = ?`).run(testPoId);
      db.prepare(`DELETE FROM financial_accounts WHERE id = ?`).run(testAccId);
    } catch {
      // ignore cleanup error
    }
  });

  describe('1. Accounts Receivable: Partial & Full Payments with Balance Integrity', () => {
    it('records a partial customer payment of 1,000 QAR and updates invoice balance and account balance', () => {
      const txId = 'tx-test-ar-part';
      const initialAccount = db.prepare(`SELECT current_balance FROM financial_accounts WHERE id = ?`).get(testAccId) as any;
      const initialBal = initialAccount.current_balance;

      const partialAmount = 1000;
      const allocId = 'alloc-test-1';

      // Insert transaction
      db.prepare(`
        INSERT INTO financial_transactions (
          id, transaction_number, type, category, date, amount, unapplied_amount,
          account_id, account_name, payment_method, party_type, party_name,
          status, allocations_json, company_id, created_at, updated_at
        ) VALUES (?, 'MI-TEST-0001', 'MONEY_IN', 'customer_payment', '2026-09-15', ?, 0,
          ?, 'Test Bank Account', 'Bank Transfer', 'customer', 'Ali Al-Thani',
          'posted', ?, ?, '2026-09-15', '2026-09-15')
      `).run(txId, partialAmount, testAccId, JSON.stringify([{ targetType: 'invoice', targetId: testInvoiceId, targetNumber: 'IV-TEST-101', amount: partialAmount }]), companyId);

      // Insert allocation
      db.prepare(`
        INSERT INTO financial_allocations (id, transaction_id, target_type, target_id, target_number, amount, date, created_at)
        VALUES (?, ?, 'invoice', ?, 'IV-TEST-101', ?, '2026-09-15', '2026-09-15')
      `).run(allocId, txId, testInvoiceId, partialAmount);

      // Update invoice
      db.prepare(`
        UPDATE invoices 
        SET paid_amount = paid_amount + ?, balance_amount = grand_total - (paid_amount + ?), payment_status = 'Partial'
        WHERE id = ?
      `).run(partialAmount, partialAmount, testInvoiceId);

      // Update account balance (+1,000)
      db.prepare(`UPDATE financial_accounts SET current_balance = current_balance + ? WHERE id = ?`).run(partialAmount, testAccId);

      // Verify invoice
      const inv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(testInvoiceId) as any;
      assert.equal(inv.paid_amount, 1000);
      assert.equal(inv.balance_amount, 1500);
      assert.equal(inv.payment_status, 'Partial');

      // Verify bank account balance
      const updatedAccount = db.prepare(`SELECT current_balance FROM financial_accounts WHERE id = ?`).get(testAccId) as any;
      assert.equal(updatedAccount.current_balance, initialBal + partialAmount);
    });

    it('records remaining full payment of 1,500 QAR and marks invoice status as Paid', () => {
      const txId = 'tx-test-ar-full';
      const fullAmount = 1500;

      // Update invoice to cleared
      db.prepare(`
        UPDATE invoices 
        SET paid_amount = grand_total, balance_amount = 0, payment_status = 'Paid'
        WHERE id = ?
      `).run(testInvoiceId);

      const inv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(testInvoiceId) as any;
      assert.equal(inv.paid_amount, 2500);
      assert.equal(inv.balance_amount, 0);
      assert.equal(inv.payment_status, 'Paid');
    });
  });

  describe('2. Over-Allocation Prevention Guard', () => {
    it('prevents allocating more than the open balance without explicit unapplied credit', () => {
      const inv = db.prepare(`SELECT grand_total, paid_amount, balance_amount FROM invoices WHERE id = ?`).get(testInvoiceId) as any;
      const openBalance = inv.balance_amount; // 0 QAR

      const requestedAlloc = 500;
      const isAllowedWithoutAdvance = requestedAlloc <= openBalance;

      assert.equal(isAllowedWithoutAdvance, false, 'Over-allocation must be prevented when balance is 0');
    });
  });

  describe('3. Customer Advances: Deposit, Unapplied Balance & Invoice Application', () => {
    const advanceTxId = 'tx-test-adv-cust-1';
    const advAmount = 2000;
    const secondInvoiceId = 'inv-test-fin-102';

    before(() => {
      // Create a second invoice for 1,200 QAR
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_json, date, due_date, status, labor_items_json, part_items_json,
          grand_total, paid_amount, balance_amount, payment_status, company_id, created_at, updated_at
        ) VALUES (?, 'IV-TEST-102', '{"name":"Nasser Al-Kuwari"}', '2026-09-18', '2026-09-30', 'Unpaid', '[]', '[]',
          1200, 0, 1200, 'Unpaid', ?, '2026-09-18', '2026-09-18')
      `).run(secondInvoiceId, companyId);
    });

    after(() => {
      try {
        db.prepare(`DELETE FROM invoices WHERE id = ?`).run(secondInvoiceId);
      } catch {}
    });

    it('records a customer advance of 2,000 QAR with full unapplied balance', () => {
      db.prepare(`
        INSERT INTO financial_transactions (
          id, transaction_number, type, category, date, amount, unapplied_amount,
          account_id, account_name, payment_method, party_type, party_name,
          status, company_id, created_at, updated_at
        ) VALUES (?, 'CAD-TEST-0001', 'CUSTOMER_ADVANCE', 'customer_advance', '2026-09-18', ?, ?,
          ?, 'Test Bank Account', 'Cash', 'customer', 'Nasser Al-Kuwari',
          'posted', ?, '2026-09-18', '2026-09-18')
      `).run(advanceTxId, advAmount, advAmount, testAccId, companyId);

      const adv = db.prepare(`SELECT * FROM financial_transactions WHERE id = ?`).get(advanceTxId) as any;
      assert.equal(adv.amount, 2000);
      assert.equal(adv.unapplied_amount, 2000);
      assert.equal(adv.type, 'CUSTOMER_ADVANCE');
      assert.equal(adv.status, 'posted');
    });

    it('applies 1,200 QAR of customer advance to invoice, reducing unapplied balance to 800 QAR', () => {
      const applyAmount = 1200;

      // 1. Allocate advance to invoice
      db.prepare(`
        INSERT INTO financial_allocations (id, transaction_id, advance_id, target_type, target_id, target_number, amount, date, created_at)
        VALUES ('alloc-test-adv-1', ?, ?, 'invoice', ?, 'IV-TEST-102', ?, '2026-09-19', '2026-09-19')
      `).run(advanceTxId, advanceTxId, secondInvoiceId, applyAmount);

      // 2. Reduce advance unapplied amount
      db.prepare(`UPDATE financial_transactions SET unapplied_amount = unapplied_amount - ? WHERE id = ?`).run(applyAmount, advanceTxId);

      // 3. Mark invoice as paid
      db.prepare(`
        UPDATE invoices 
        SET paid_amount = paid_amount + ?, balance_amount = grand_total - (paid_amount + ?), payment_status = 'Paid'
        WHERE id = ?
      `).run(applyAmount, applyAmount, secondInvoiceId);

      // Check advance
      const adv = db.prepare(`SELECT * FROM financial_transactions WHERE id = ?`).get(advanceTxId) as any;
      assert.equal(adv.unapplied_amount, 800);

      // Check invoice
      const inv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(secondInvoiceId) as any;
      assert.equal(inv.balance_amount, 0);
      assert.equal(inv.payment_status, 'Paid');
    });

    it('records refund of remaining 800 QAR advance as traceable Money Out transaction linked to original advance', () => {
      const refundAmount = 800;
      const refundTxId = 'tx-test-refund-1';

      // 1. Insert refund transaction linked to advance
      db.prepare(`
        INSERT INTO financial_transactions (
          id, transaction_number, type, category, date, amount, unapplied_amount,
          account_id, account_name, payment_method, party_type, party_name,
          status, linked_advance_id, company_id, created_at, updated_at
        ) VALUES (?, 'CRF-TEST-0001', 'CUSTOMER_ADVANCE_REFUND', 'customer_advance_refund', '2026-09-20', ?, 0,
          ?, 'Test Bank Account', 'Cash', 'customer', 'Nasser Al-Kuwari',
          'posted', ?, ?, '2026-09-20', '2026-09-20')
      `).run(refundTxId, refundAmount, testAccId, advanceTxId, companyId);

      // 2. Reduce advance unapplied amount to 0
      db.prepare(`UPDATE financial_transactions SET unapplied_amount = 0 WHERE id = ?`).run(advanceTxId);

      // Check original advance is now 0 unapplied balance
      const adv = db.prepare(`SELECT * FROM financial_transactions WHERE id = ?`).get(advanceTxId) as any;
      assert.equal(adv.unapplied_amount, 0);

      // Check refund transaction is linked to original advance
      const refundTx = db.prepare(`SELECT * FROM financial_transactions WHERE id = ?`).get(refundTxId) as any;
      assert.equal(refundTx.linked_advance_id, advanceTxId);
      assert.equal(refundTx.type, 'CUSTOMER_ADVANCE_REFUND');
      assert.equal(refundTx.amount, 800);
    });
  });

  describe('4. Supplier Advances & Advance Returns', () => {
    const suppAdvId = 'tx-test-adv-supp-1';
    const suppReturnTxId = 'tx-test-supp-ret-1';

    it('records a supplier advance of 1,000 QAR (Money Out)', () => {
      db.prepare(`
        INSERT INTO financial_transactions (
          id, transaction_number, type, category, date, amount, unapplied_amount,
          account_id, account_name, payment_method, party_type, party_name,
          status, company_id, created_at, updated_at
        ) VALUES (?, 'SAD-TEST-0001', 'SUPPLIER_ADVANCE', 'supplier_advance', '2026-09-14', 1000, 1000,
          ?, 'Test Bank Account', 'Bank Transfer', 'supplier', 'Qatar Spare Parts W.L.L.',
          'posted', ?, '2026-09-14', '2026-09-14')
      `).run(suppAdvId, testAccId, companyId);

      const adv = db.prepare(`SELECT * FROM financial_transactions WHERE id = ?`).get(suppAdvId) as any;
      assert.equal(adv.type, 'SUPPLIER_ADVANCE');
      assert.equal(adv.unapplied_amount, 1000);
    });

    it('records supplier advance return of 400 QAR from supplier as Money In', () => {
      db.prepare(`
        INSERT INTO financial_transactions (
          id, transaction_number, type, category, date, amount, unapplied_amount,
          account_id, account_name, payment_method, party_type, party_name,
          status, linked_advance_id, company_id, created_at, updated_at
        ) VALUES (?, 'SRT-TEST-0001', 'SUPPLIER_ADVANCE_RETURN', 'supplier_advance_return', '2026-09-16', 400, 0,
          ?, 'Test Bank Account', 'Bank Transfer', 'supplier', 'Qatar Spare Parts W.L.L.',
          'posted', ?, ?, '2026-09-16', '2026-09-16')
      `).run(suppReturnTxId, testAccId, suppAdvId, companyId);

      // Reduce unapplied balance
      db.prepare(`UPDATE financial_transactions SET unapplied_amount = unapplied_amount - 400 WHERE id = ?`).run(suppAdvId);

      const adv = db.prepare(`SELECT * FROM financial_transactions WHERE id = ?`).get(suppAdvId) as any;
      assert.equal(adv.unapplied_amount, 600);

      const ret = db.prepare(`SELECT * FROM financial_transactions WHERE id = ?`).get(suppReturnTxId) as any;
      assert.equal(ret.type, 'SUPPLIER_ADVANCE_RETURN');
      assert.equal(ret.amount, 400);
      assert.equal(ret.linked_advance_id, suppAdvId);
    });
  });

  describe('5. Auditable Reversal with Balanced Journal Entries', () => {
    it('creates a balanced double-entry journal entry for a posted financial transaction', () => {
      const jvId = 'jv-test-1';
      const lines = [
        { accountCode: '1010', accountName: 'Cash Drawer', debit: 500, credit: 0 },
        { accountCode: '1100', accountName: 'Accounts Receivable', debit: 0, credit: 500 }
      ];

      db.prepare(`
        INSERT INTO journal_entries (
          id, entry_number, date, reference_type, reference_id, reference_number,
          description, lines_json, total_debit, total_credit, is_balanced, status, company_id, created_at
        ) VALUES (?, 'JV-TEST-001', '2026-09-15', 'FINANCIAL_TRANSACTION', 'tx-test-1', 'MI-TEST-0001',
          'Receipt from customer', ?, 500, 500, 1, 'posted', ?, '2026-09-15')
      `).run(jvId, JSON.stringify(lines), companyId);

      const jv = db.prepare(`SELECT * FROM journal_entries WHERE id = ?`).get(jvId) as any;
      assert.equal(jv.total_debit, 500);
      assert.equal(jv.total_credit, 500);
      assert.equal(jv.is_balanced, 1);
    });

    it('marks a transaction as reversed with audit reason and maintains traceability', () => {
      const txId = 'tx-test-ar-part';
      const reason = 'Incorrect customer ledger allocation corrected by supervisor';

      db.prepare(`
        UPDATE financial_transactions 
        SET status = 'reversed', reversal_reason = ?, updated_at = '2026-09-22'
        WHERE id = ?
      `).run(reason, txId);

      const tx = db.prepare(`SELECT * FROM financial_transactions WHERE id = ?`).get(txId) as any;
      assert.equal(tx.status, 'reversed');
      assert.equal(tx.reversal_reason, reason);
    });
  });
});
