-- ====================================================================
-- NAJM AL HUDA GARAGE & SCRAP TRADING ERP
-- Phase 4 Migration: Advanced Inventory, POs, Supplier Ledgers & Scrap Module
-- ====================================================================

-- 1. Expand Inventory Items Table
ALTER TABLE IF EXISTS inventory_items
ADD COLUMN IF NOT EXISTS oem_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS part_type VARCHAR(50) DEFAULT 'OEM',
ADD COLUMN IF NOT EXISTS min_reorder_level INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS rack_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10,2) DEFAULT 0.00;

-- 2. Stock Movements Log Table
CREATE TABLE IF NOT EXISTS stock_movements (
    id VARCHAR(100) PRIMARY KEY,
    item_id VARCHAR(100),
    sku VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'return', 'scrap')),
    quantity NUMERIC(10,2) NOT NULL,
    previous_qty NUMERIC(10,2) NOT NULL,
    new_qty NUMERIC(10,2) NOT NULL,
    reason TEXT,
    user_name VARCHAR(100) NOT NULL,
    reference_no VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Supplier Ledgers Table
CREATE TABLE IF NOT EXISTS supplier_ledgers (
    id VARCHAR(100) PRIMARY KEY,
    supplier_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    type VARCHAR(50) NOT NULL,
    reference_no VARCHAR(100) NOT NULL,
    description TEXT,
    amount NUMERIC(12,2) NOT NULL,
    balance_after NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Purchase Orders & Partial Receiving Items
CREATE TABLE IF NOT EXISTS purchase_orders (
    id VARCHAR(100) PRIMARY KEY,
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id VARCHAR(100),
    supplier_name VARCHAR(255) NOT NULL,
    supplier_contact VARCHAR(255),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    received_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled')),
    payment_status VARCHAR(50) DEFAULT 'Unpaid',
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id VARCHAR(100) PRIMARY KEY,
    po_id VARCHAR(100) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    part_id VARCHAR(100),
    sku VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    quantity_ordered NUMERIC(10,2) NOT NULL,
    quantity_received NUMERIC(10,2) DEFAULT 0.00,
    unit_cost NUMERIC(10,2) NOT NULL,
    total_cost NUMERIC(12,2) NOT NULL
);

-- 5. Scrap Module Tables (Najm Al Huda Scrap Business)
CREATE TABLE IF NOT EXISTS scrap_price_rates (
    material VARCHAR(100) PRIMARY KEY,
    buying_rate_per_kg NUMERIC(10,2) NOT NULL,
    selling_rate_per_kg NUMERIC(10,2) NOT NULL,
    last_updated DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS scrap_intakes (
    id VARCHAR(100) PRIMARY KEY,
    receipt_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(100) NOT NULL,
    vehicle_info TEXT,
    material VARCHAR(100) NOT NULL,
    weight_kg NUMERIC(10,2) NOT NULL,
    rate_per_kg NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    seller_name VARCHAR(255),
    seller_qid VARCHAR(50),
    seller_phone VARCHAR(50),
    photos TEXT[],
    user_name VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scrap_sales (
    id VARCHAR(100) PRIMARY KEY,
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    buyer_name VARCHAR(255) NOT NULL,
    buyer_contact VARCHAR(255),
    material VARCHAR(100) NOT NULL,
    weight_kg NUMERIC(10,2) NOT NULL,
    sale_rate_per_kg NUMERIC(10,2) NOT NULL,
    total_revenue NUMERIC(12,2) NOT NULL,
    avg_cost_per_kg NUMERIC(10,2) NOT NULL,
    profit_margin NUMERIC(12,2) NOT NULL,
    margin_percent NUMERIC(5,2) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial scrap rates
INSERT INTO scrap_price_rates (material, buying_rate_per_kg, selling_rate_per_kg, last_updated)
VALUES 
    ('Steel / Heavy Metal', 1.20, 1.65, CURRENT_DATE),
    ('Aluminum / Alloy Wheels', 5.80, 7.40, CURRENT_DATE),
    ('Copper Wiring & Radiators', 24.50, 29.80, CURRENT_DATE),
    ('Catalytic Converter (Platinum)', 180.00, 240.00, CURRENT_DATE),
    ('Brass & Bronze', 16.50, 21.00, CURRENT_DATE),
    ('Lead-Acid Battery', 3.80, 4.90, CURRENT_DATE),
    ('Other Scrap', 0.90, 1.25, CURRENT_DATE)
ON CONFLICT (material) DO UPDATE 
SET buying_rate_per_kg = EXCLUDED.buying_rate_per_kg,
    selling_rate_per_kg = EXCLUDED.selling_rate_per_kg,
    last_updated = EXCLUDED.last_updated;
