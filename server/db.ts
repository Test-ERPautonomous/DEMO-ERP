import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';

export function getDatabasePath(): string {
  if (process.env.SQLITE_DB_PATH) {
    return process.env.SQLITE_DB_PATH;
  }

  // Prioritize persistent directories (custom DATA_DIR, ./data, ../najm_data outside public_html, etc.)
  const candidateDirs = [
    process.env.DATA_DIR,
    path.resolve(process.cwd(), 'data'),
    path.resolve(process.cwd(), '..', 'najm_data'),
    path.resolve(process.cwd(), '..', 'data'),
    '/tmp/najm-data',
    process.env.TMPDIR || '/tmp'
  ].filter(Boolean) as string[];

  for (const localDir of candidateDirs) {
    try {
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }
      const testFile = path.join(localDir, '.write-test-' + process.pid);
      fs.writeFileSync(testFile, '1');
      fs.unlinkSync(testFile);

      // Check if database.sqlite already exists in this directory
      if (fs.existsSync(path.join(localDir, 'database.sqlite'))) {
        return path.join(localDir, 'database.sqlite');
      }
      return path.join(localDir, 'workshop.db');
    } catch (err) {
      continue;
    }
  }

  return path.join(process.env.TMPDIR || '/tmp', 'workshop.db');
}

export function checkAndRepairDatabase(database: DatabaseSync): boolean {
  try {
    const check = database.prepare('PRAGMA quick_check;').all() as any[];
    const isOk = check.length === 1 && (check[0]?.quick_check === 'ok' || check[0]?.integrity_check === 'ok');
    if (!isOk) {
      console.warn('[DB] SQLite integrity issue detected. Running automated recovery REINDEX...', check);
      database.exec('REINDEX;');
      const recheck = database.prepare('PRAGMA quick_check;').all() as any[];
      const recovered = recheck.length === 1 && (recheck[0]?.quick_check === 'ok' || recheck[0]?.integrity_check === 'ok');
      if (recovered) {
        console.log('[DB] SQLite database successfully recovered and indices rebuilt.');
        return true;
      }
      console.error('[DB] SQLite recovery warning: Database still reports check anomalies:', recheck);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[DB] Quick check error, attempting emergency REINDEX:', err?.message);
    try {
      database.exec('REINDEX;');
      console.log('[DB] Emergency REINDEX completed successfully.');
      return true;
    } catch (reindexErr: any) {
      console.error('[DB] Emergency REINDEX failed:', reindexErr?.message);
      return false;
    }
  }
}

export function createDatabaseConnection(filePath: string): DatabaseSync {
  try {
    const connection = new DatabaseSync(filePath);
    try {
      connection.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
      `);
    } catch (e: any) {
      console.warn('[DB] PRAGMA setup notice:', e?.message);
    }
    checkAndRepairDatabase(connection);
    return connection;
  } catch (err: any) {
    if (err?.message?.includes('malformed') || err?.code === 'ERR_SQLITE_ERROR') {
      console.error('[DB] Database file malformed on open. Backing up and recreating cleanly...', err?.message);
      try {
        if (fs.existsSync(filePath)) {
          fs.copyFileSync(filePath, `${filePath}.corrupt.${Date.now()}`);
          fs.unlinkSync(filePath);
        }
        for (const ext of ['-shm', '-wal']) {
          if (fs.existsSync(filePath + ext)) {
            try { fs.unlinkSync(filePath + ext); } catch {}
          }
        }
      } catch (backupErr: any) {
        console.warn('[DB] Backup error during emergency reset:', backupErr?.message);
      }
      const fresh = new DatabaseSync(filePath);
      try {
        fresh.exec(`
          PRAGMA journal_mode = WAL;
          PRAGMA foreign_keys = ON;
        `);
      } catch {}
      return fresh;
    }
    throw err;
  }
}

export const DB_FILE = getDatabasePath();
export const db = createDatabaseConnection(DB_FILE);

let isInitialized = false;

export function initDatabase() {
  if (isInitialized) return;
  checkAndRepairDatabase(db);
  db.exec(`
    -- Users Table (with hashed passwords, no plaintext credentials)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      permissions_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_login TEXT
    );

    -- Staff Accounts Table for dedicated server-side staff authentication
    CREATE TABLE IF NOT EXISTS staff_accounts (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'service_advisor',
      password_hash TEXT NOT NULL,
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      permissions_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_login TEXT
    );

    -- Active Sessions Table for secure server-side auth
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Settings & Company Configuration Table
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Companies Table
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      name_ar TEXT,
      cr_number TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      settings_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Document Sequences Counter Table
    CREATE TABLE IF NOT EXISTS document_sequences (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL DEFAULT 'comp-1',
      doc_type TEXT NOT NULL,
      year INTEGER NOT NULL DEFAULT 0,
      next_number INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL,
      UNIQUE(company_id, doc_type, year)
    );

    -- Customers Master Table
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      customer_id TEXT UNIQUE NOT NULL,
      customer_number TEXT,
      name TEXT NOT NULL,
      name_ar TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      qid TEXT,
      address TEXT,
      company_id TEXT DEFAULT 'comp-1',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Vehicles Master Table
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      vehicle_number TEXT,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      plate_number TEXT UNIQUE NOT NULL,
      vin TEXT,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      color TEXT,
      mileage INTEGER DEFAULT 0,
      engine_no TEXT,
      transmission TEXT,
      fuel_type TEXT,
      company_id TEXT DEFAULT 'comp-1',
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Inventory & Spare Parts Master Table
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      barcode TEXT,
      oem_part_number TEXT,
      aftermarket_part_number TEXT,
      name TEXT NOT NULL,
      name_ar TEXT,
      category TEXT NOT NULL,
      vehicle_compatibility TEXT,
      unit_of_measure TEXT DEFAULT 'PCS',
      rack_location TEXT,
      bin_location TEXT,
      supplier_id TEXT,
      supplier_name TEXT,
      unit_cost REAL NOT NULL DEFAULT 0,
      retail_price REAL NOT NULL DEFAULT 0,
      min_reorder_level INTEGER NOT NULL DEFAULT 5,
      quantity_on_hand INTEGER NOT NULL DEFAULT 0,
      quantity_reserved INTEGER NOT NULL DEFAULT 0,
      quantity_available INTEGER NOT NULL DEFAULT 0,
      quantity_damaged INTEGER NOT NULL DEFAULT 0,
      quantity_on_order INTEGER NOT NULL DEFAULT 0,
      batch_number TEXT,
      expiry_date TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Stock Movements Table
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
      sku TEXT NOT NULL,
      item_name TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      previous_qty INTEGER NOT NULL,
      new_qty INTEGER NOT NULL,
      unit_cost REAL NOT NULL DEFAULT 0,
      reference_type TEXT,
      reference_number TEXT,
      user_id TEXT,
      user_name TEXT,
      reason TEXT,
      timestamp TEXT NOT NULL
    );

    -- Suppliers Master Table
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      supplier_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      name_ar TEXT,
      contact_person TEXT,
      phone TEXT,
      email TEXT,
      trn TEXT,
      cr_number TEXT,
      address TEXT,
      payment_terms TEXT,
      balance REAL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Purchase Orders Table
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      po_number TEXT UNIQUE NOT NULL,
      supplier_id TEXT,
      supplier_name TEXT NOT NULL,
      supplier_contact TEXT,
      date TEXT NOT NULL,
      expected_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      items_json TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'Unpaid',
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Goods Receipt Notes (GRN) Table
    CREATE TABLE IF NOT EXISTS goods_receipt_notes (
      id TEXT PRIMARY KEY,
      grn_number TEXT UNIQUE NOT NULL,
      po_number TEXT NOT NULL,
      po_id TEXT,
      supplier_name TEXT NOT NULL,
      delivery_note_number TEXT,
      receipt_date TEXT NOT NULL,
      received_by TEXT NOT NULL,
      items_json TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Inspected & Received',
      notes TEXT,
      created_at TEXT NOT NULL
    );

    -- Job Cards Table
    CREATE TABLE IF NOT EXISTS job_cards (
      id TEXT PRIMARY KEY,
      job_number TEXT UNIQUE NOT NULL,
      customer_json TEXT NOT NULL,
      vehicle_json TEXT NOT NULL,
      date_in TEXT NOT NULL,
      promised_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Inspection',
      bay_assigned TEXT,
      technician_assigned TEXT,
      complaints_json TEXT NOT NULL,
      diagnosis TEXT,
      parts_json TEXT NOT NULL,
      labor_json TEXT NOT NULL,
      photos_json TEXT DEFAULT '[]',
      fuel_level INTEGER DEFAULT 50,
      odometer_in INTEGER DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      advance_paid REAL NOT NULL DEFAULT 0,
      balance_amount REAL NOT NULL DEFAULT 0,
      invoice_id TEXT,
      company_id TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT
    );

    -- Job Status Audit History Table
    CREATE TABLE IF NOT EXISTS job_status_history (
      id TEXT PRIMARY KEY,
      job_card_id TEXT NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
      from_status TEXT,
      to_status TEXT NOT NULL,
      changed_by TEXT NOT NULL,
      reason TEXT,
      timestamp TEXT NOT NULL
    );

    -- Invoices Table
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      job_card_id TEXT,
      job_number TEXT,
      customer_json TEXT NOT NULL,
      vehicle_json TEXT,
      date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Unpaid',
      payment_status TEXT NOT NULL DEFAULT 'Unpaid',
      labor_items_json TEXT NOT NULL,
      part_items_json TEXT NOT NULL,
      additional_charges_json TEXT DEFAULT '[]',
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate_percent REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      balance_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT,
      payments_json TEXT NOT NULL DEFAULT '[]',
      is_locked INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      company_id TEXT DEFAULT 'comp-1',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Estimates Table
    CREATE TABLE IF NOT EXISTS estimates (
      id TEXT PRIMARY KEY,
      estimate_number TEXT UNIQUE NOT NULL,
      customer_json TEXT NOT NULL,
      vehicle_json TEXT NOT NULL,
      date TEXT NOT NULL,
      valid_until TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_rate_percent REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      approved_date TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    -- Counter Sales Table
    CREATE TABLE IF NOT EXISTS counter_sales (
      id TEXT PRIMARY KEY,
      sale_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      date TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      payment_status TEXT NOT NULL DEFAULT 'Paid',
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    -- Scrap Price Rates Table
    CREATE TABLE IF NOT EXISTS scrap_rates (
      material_type TEXT PRIMARY KEY,
      buying_rate REAL NOT NULL,
      selling_rate REAL NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Scrap Intakes Table
    CREATE TABLE IF NOT EXISTS scrap_intakes (
      id TEXT PRIMARY KEY,
      receipt_no TEXT UNIQUE NOT NULL,
      seller_name TEXT NOT NULL,
      seller_phone TEXT,
      seller_qid TEXT,
      material_type TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      price_per_kg REAL NOT NULL,
      total_amount REAL NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'Cash',
      date TEXT NOT NULL,
      vehicle_plate TEXT,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    -- Scrap Sales Table
    CREATE TABLE IF NOT EXISTS scrap_sales (
      id TEXT PRIMARY KEY,
      invoice_no TEXT UNIQUE NOT NULL,
      buyer_company TEXT NOT NULL,
      buyer_phone TEXT,
      material_type TEXT NOT NULL,
      weight_kg REAL NOT NULL,
      rate_per_kg REAL NOT NULL,
      total_amount REAL NOT NULL,
      cost_per_kg REAL NOT NULL,
      cost_amount REAL NOT NULL,
      profit_margin REAL NOT NULL,
      margin_percent REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Paid',
      date TEXT NOT NULL,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL
    );

    -- Server Audit Logs Table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      role TEXT,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      record_id TEXT,
      previous_value_json TEXT,
      new_value_json TEXT,
      details TEXT,
      ip_address TEXT
    );

    -- Technicians Registry Table
    CREATE TABLE IF NOT EXISTS technicians (
      id TEXT PRIMARY KEY,
      employee_id TEXT,
      name TEXT NOT NULL,
      role TEXT,
      specialization TEXT NOT NULL,
      phone TEXT,
      hourly_cost REAL DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Available',
      current_job_id TEXT,
      bay_assigned TEXT,
      bays_json TEXT DEFAULT '[]',
      joining_date TEXT,
      notes TEXT,
      created_at TEXT
    );

    -- Labor Rates Master Table
    CREATE TABLE IF NOT EXISTS labor_rates (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      standard_hours REAL NOT NULL DEFAULT 1.0,
      hourly_rate REAL NOT NULL DEFAULT 150.0,
      total_rate REAL NOT NULL DEFAULT 150.0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Paint Codes Master Table
    CREATE TABLE IF NOT EXISTS paint_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      color_name TEXT NOT NULL,
      manufacturer TEXT NOT NULL,
      finish_type TEXT NOT NULL DEFAULT 'Metallic',
      mixing_ratio TEXT DEFAULT '2:1 + 10%',
      price_per_panel REAL NOT NULL DEFAULT 350.0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Financial Accounts Master Table (Cash / Bank)
    CREATE TABLE IF NOT EXISTS financial_accounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'cash' | 'bank'
      bank_name TEXT,
      account_number TEXT,
      currency TEXT NOT NULL DEFAULT 'QAR',
      opening_balance REAL NOT NULL DEFAULT 0,
      current_balance REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      company_id TEXT DEFAULT 'comp-1',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Financial Transactions Table (Money In, Money Out, Advances, Returns)
    CREATE TABLE IF NOT EXISTS financial_transactions (
      id TEXT PRIMARY KEY,
      transaction_number TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL, -- 'MONEY_IN' | 'MONEY_OUT' | 'CUSTOMER_ADVANCE' | 'SUPPLIER_ADVANCE' | 'CUSTOMER_ADVANCE_REFUND' | 'SUPPLIER_ADVANCE_RETURN' | 'TRANSFER'
      category TEXT NOT NULL, -- 'customer_payment' | 'customer_advance' | 'customer_advance_refund' | 'supplier_payment' | 'supplier_advance' | 'supplier_advance_return' | 'expense' | 'other_income' | 'account_transfer'
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      unapplied_amount REAL NOT NULL DEFAULT 0,
      account_id TEXT NOT NULL REFERENCES financial_accounts(id),
      account_name TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      party_type TEXT NOT NULL, -- 'customer' | 'supplier' | 'other'
      party_id TEXT,
      party_name TEXT NOT NULL,
      party_phone TEXT,
      reference_number TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'posted', -- 'draft' | 'posted' | 'reversed' | 'cancelled'
      linked_invoice_id TEXT,
      linked_job_card_id TEXT,
      linked_po_id TEXT,
      linked_advance_id TEXT,
      reversal_of_id TEXT,
      reversal_reason TEXT,
      allocations_json TEXT DEFAULT '[]',
      created_by TEXT,
      posted_by TEXT,
      posted_at TEXT,
      company_id TEXT DEFAULT 'comp-1',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Financial Allocations Table (Traceable links to Invoices, Purchase Orders, Bills)
    CREATE TABLE IF NOT EXISTS financial_allocations (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES financial_transactions(id) ON DELETE CASCADE,
      advance_id TEXT,
      target_type TEXT NOT NULL, -- 'invoice' | 'purchase_order' | 'bill'
      target_id TEXT NOT NULL,
      target_number TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Double-Entry Journal Entries Table
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      entry_number TEXT UNIQUE NOT NULL,
      date TEXT NOT NULL,
      reference_type TEXT,
      reference_id TEXT,
      reference_number TEXT,
      description TEXT NOT NULL,
      lines_json TEXT NOT NULL,
      total_debit REAL NOT NULL,
      total_credit REAL NOT NULL,
      is_balanced INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'posted',
      created_by TEXT,
      company_id TEXT DEFAULT 'comp-1',
      created_at TEXT NOT NULL
    );

    -- Indexes for fast queries
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
    CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards(status);
    CREATE INDEX IF NOT EXISTS idx_job_cards_job_number ON job_cards(job_number);
    CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_doc_sequences_lookup ON document_sequences(company_id, doc_type, year);
    CREATE INDEX IF NOT EXISTS idx_fin_tx_date ON financial_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_fin_tx_type ON financial_transactions(type);
    CREATE INDEX IF NOT EXISTS idx_fin_tx_status ON financial_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_fin_tx_party ON financial_transactions(party_type, party_id);
    CREATE INDEX IF NOT EXISTS idx_fin_alloc_target ON financial_allocations(target_type, target_id);

  `);

  const migrations = [
    `ALTER TABLE technicians ADD COLUMN employee_id TEXT`,
    `ALTER TABLE technicians ADD COLUMN technician_number TEXT`,
    `ALTER TABLE technicians ADD COLUMN role TEXT`,
    `ALTER TABLE technicians ADD COLUMN hourly_cost REAL DEFAULT 0`,
    `ALTER TABLE technicians ADD COLUMN hourly_rate REAL DEFAULT 0`,
    `ALTER TABLE technicians ADD COLUMN bays_json TEXT DEFAULT '[]'`,
    `ALTER TABLE technicians ADD COLUMN joining_date TEXT`,
    `ALTER TABLE technicians ADD COLUMN notes TEXT`,
    `ALTER TABLE technicians ADD COLUMN created_at TEXT`,
    `ALTER TABLE technicians ADD COLUMN company_id TEXT DEFAULT 'comp-1'`,
    `ALTER TABLE customers ADD COLUMN customer_number TEXT`,
    `ALTER TABLE vehicles ADD COLUMN vehicle_number TEXT`,
    `ALTER TABLE vehicles ADD COLUMN company_id TEXT DEFAULT 'comp-1'`,
    `ALTER TABLE suppliers ADD COLUMN supplier_number TEXT`,
    `ALTER TABLE suppliers ADD COLUMN company_id TEXT DEFAULT 'comp-1'`,
    `ALTER TABLE purchase_orders ADD COLUMN company_id TEXT DEFAULT 'comp-1'`,
    `ALTER TABLE goods_receipt_notes ADD COLUMN company_id TEXT DEFAULT 'comp-1'`,
    `ALTER TABLE estimates ADD COLUMN company_id TEXT DEFAULT 'comp-1'`,
    `ALTER TABLE counter_sales ADD COLUMN company_id TEXT DEFAULT 'comp-1'`,
    `ALTER TABLE counter_sales ADD COLUMN paid_amount REAL DEFAULT 0`,
    `ALTER TABLE counter_sales ADD COLUMN balance_amount REAL DEFAULT 0`,
    `ALTER TABLE scrap_intakes ADD COLUMN company_id TEXT DEFAULT 'comp-1'`,
    `ALTER TABLE invoices ADD COLUMN company_id TEXT DEFAULT 'comp-1'`,
    `ALTER TABLE invoices ADD COLUMN payment_status TEXT DEFAULT 'Unpaid'`,
    `ALTER TABLE job_cards ADD COLUMN data_json TEXT`
  ];
  migrations.forEach(sql => {
    try { db.exec(sql); } catch {}
  });

  // Ensure verified Master Admin (autonomous.hostinger@gmail.com) exists in users table
  try {
    const ownerPermissions = JSON.stringify({
      canViewDashboard: true,
      canManageJobCards: true,
      canAdvanceJobStatus: true,
      canManageDentingPainting: true,
      canManageInventory: true,
      canManagePurchasesAndSales: true,
      canViewServiceHistory: true,
      canManageBilling: true,
      canManageSettings: true,
      canManageUsers: true
    });
    const defaultOwnerHash = '$2b$10$oo30XHJgODijVkM682z2UuqETbr.0ALssZ1VZXhhkJOgcMHY4ry4K'; // admin123
    db.prepare(`
      INSERT INTO users (id, username, email, full_name, role, password_hash, phone, is_active, permissions_json, created_at)
      VALUES (
        '7546d542-d035-498c-9e37-e2f0d8cf20db',
        'autonomous.hostinger',
        'autonomous.hostinger@gmail.com',
        'Master Administrator',
        'owner',
        ?,
        '+974 4450 8899',
        1,
        ?,
        '2026-10-15T21:03:49.443Z'
      )
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        role = 'owner',
        password_hash = CASE WHEN users.password_hash IS NULL OR users.password_hash = '' THEN excluded.password_hash ELSE users.password_hash END,
        is_active = 1,
        permissions_json = excluded.permissions_json
    `).run(defaultOwnerHash, ownerPermissions);
  } catch (seedErr: any) {
    console.warn('[DB] Notice initializing verified owner in users table:', seedErr?.message);
  }

  isInitialized = true;
  console.log('[DB] SQLite database initialized successfully at', DB_FILE);
}

// Auto-initialize SQLite database tables on load
try {
  initDatabase();
} catch (e: any) {
  console.warn('[DB] Auto-initialization warning:', e?.message);
}
