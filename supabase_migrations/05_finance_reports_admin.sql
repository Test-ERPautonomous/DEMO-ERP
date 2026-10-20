-- supabase_migrations/05_finance_reports_admin.sql
-- Phase 5: Finance, Warranty, Insurance Claims, Expenses, and System Audits

-- 1. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Rent', 'Utilities', 'Salaries', 'Consumables', 'Marketing', 'Other'
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    vat_amount NUMERIC(12,2) DEFAULT 0.00, -- Qatar standard 5% VAT if applicable
    total_amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'Cash', 'Card', 'Bank Transfer', 'Cheque'
    payee VARCHAR(255) NOT NULL,
    reference_number VARCHAR(100),
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Warranty Tracking Table
CREATE TABLE IF NOT EXISTS warranty_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Part', 'Labor/Job'
    reference_id VARCHAR(100) NOT NULL, -- SKU or Job Card Number
    item_name VARCHAR(255) NOT NULL,
    customer_id VARCHAR(100),
    customer_name VARCHAR(255) NOT NULL,
    duration_months INT NOT NULL DEFAULT 6,
    start_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active', -- 'Active', 'Expired', 'Claimed'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insurance Claims Table (for body shop jobs)
CREATE TABLE IF NOT EXISTS insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(50) NOT NULL,
    job_card_id VARCHAR(100) NOT NULL,
    job_card_number VARCHAR(100) NOT NULL,
    insurance_company VARCHAR(255) NOT NULL, -- e.g. 'Qatar Insurance Company (QIC)', 'Al Koot', 'Libano-Suisse'
    policy_number VARCHAR(100) NOT NULL,
    claim_number VARCHAR(100) NOT NULL,
    surveyor_name VARCHAR(100),
    survey_date DATE,
    deductible_amount NUMERIC(12,2) DEFAULT 0.00, -- Excess payment by customer
    approval_status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected', 'Partially Approved'
    approved_parts TEXT, -- List of approved parts/services
    rejected_parts TEXT, -- Rejected items/parts
    claim_amount NUMERIC(12,2) DEFAULT 0.00,
    claim_date DATE,
    settlement_status VARCHAR(50) NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Settled'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. System Audit Logs Table
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    username VARCHAR(100) NOT NULL,
    action VARCHAR(255) NOT NULL, -- e.g., 'Status Changed', 'Payment Recorded', 'Invoice Generated', 'Part Added'
    module VARCHAR(100) NOT NULL, -- 'Operations', 'Finance', 'Inventory', 'Scrap', 'User Management'
    details TEXT,
    reference_id VARCHAR(100), -- ID of the related entity
    ip_address VARCHAR(45)
);

-- Indexes for performance & quick reports
CREATE INDEX IF NOT EXISTS idx_expenses_company ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_warranty_company ON warranty_records(company_id);
CREATE INDEX IF NOT EXISTS idx_insurance_job_card ON insurance_claims(job_card_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON system_audit_logs(company_id);
