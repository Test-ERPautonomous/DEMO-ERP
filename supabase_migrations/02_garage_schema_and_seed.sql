-- ==============================================================================
-- NAJM AL HUDA GARAGE & SCRAP TRADING - SUPABASE PHASE 2 MIGRATION
-- Migration: 02_garage_schema_and_seed.sql
-- Description: Complete Postgres Schema for Core Garage Entities, Foreign Keys,
--              Indexes, Row Level Security (RLS) on all tables, and Realistic Qatar Seed Data.
-- Target: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. CORE MASTER ENTITIES (Customers, Vehicles, Suppliers, Technicians, Bays)
-- ==============================================================================

-- 1.1 CUSTOMERS
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    national_id TEXT, -- Qatar ID (QID)
    address TEXT,
    customer_type TEXT NOT NULL DEFAULT 'Individual', -- 'Individual', 'Corporate', 'Insurance'
    company_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on customer phone
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

-- 1.2 VEHICLES
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    plate_number TEXT NOT NULL UNIQUE, -- Qatar License Plate
    vin TEXT UNIQUE, -- 17-character VIN / Chassis #
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    color TEXT,
    current_mileage INTEGER DEFAULT 0,
    fuel_type TEXT DEFAULT 'Petrol',
    transmission TEXT DEFAULT 'Automatic',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on plate_number and VIN
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON public.vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON public.vehicles(customer_id);

-- 1.3 SUPPLIERS
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    category TEXT DEFAULT 'Auto Parts', -- 'OEM Parts', 'Oils & Lubricants', 'Paint & Body Materials', 'Scrap Metal'
    payment_terms TEXT DEFAULT 'Credit 30 Days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- 1.4 WORKSHOP BAYS
CREATE TABLE IF NOT EXISTS public.bays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bay_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    bay_type TEXT NOT NULL, -- 'Mechanical Lift', 'Quick Service', 'Alignment & Tires', 'Paint Booth', 'Denting & Body'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.5 TECHNICIANS
CREATE TABLE IF NOT EXISTS public.technicians (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT,
    specialization TEXT NOT NULL, -- 'Master Mechanic', 'Dent & Frame Specialist', 'Spray Painter', 'Auto Electrician'
    hourly_rate NUMERIC(10, 2) DEFAULT 80.00,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. INVENTORY & STOCK MANAGEMENT
-- ==============================================================================

-- 2.1 INVENTORY ITEMS
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    part_number TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Engine & Filters', 'Brakes & Suspension', 'Lubricants & Fluids', 'Body & Paint Materials', 'Scrap Harvesting'
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER NOT NULL DEFAULT 5,
    unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    location TEXT, -- 'Shelf A-01', 'Oil Rack', 'Chemical Cabinet'
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory_items(category);

-- 2.2 STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL, -- 'PURCHASE_RECEIPT', 'JOB_CARD_ISSUE', 'RETURN_TO_STOCK', 'ADJUSTMENT', 'SCRAP_HARVEST'
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    reference_id TEXT, -- job_card_id, po_id, or adjustment note
    performed_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(item_id);

-- 2.3 PURCHASE ORDERS & PO ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery DATE,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Ordered', 'Received', 'Cancelled'
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL
);

-- ==============================================================================
-- 3. WORKSHOP OPERATIONS (Job Cards, Status History, Parts & Labor Allocation)
-- ==============================================================================

-- 3.1 JOB CARDS
CREATE TABLE IF NOT EXISTS public.job_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    bay_id UUID REFERENCES public.bays(id) ON DELETE SET NULL,
    lead_technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Approved', 'In Progress', 'Painting Booth', 'Quality Check', 'Ready', 'Delivered', 'Cancelled'
    job_type TEXT NOT NULL DEFAULT 'Mechanical & Service', -- 'Mechanical & Service', 'Body Collision & Paint', 'Comprehensive Overhaul', 'Quick Service'
    description TEXT NOT NULL,
    promised_date TIMESTAMPTZ,
    actual_delivery_date TIMESTAMPTZ,
    total_parts_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_labor_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on job status, customer, vehicle
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON public.job_cards(status);
CREATE INDEX IF NOT EXISTS idx_job_cards_number ON public.job_cards(job_number);
CREATE INDEX IF NOT EXISTS idx_job_cards_vehicle ON public.job_cards(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_job_cards_customer ON public.job_cards(customer_id);

-- 3.2 JOB STATUS HISTORY (Audit Trail)
CREATE TABLE IF NOT EXISTS public.job_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_card_id UUID NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_job_history_job ON public.job_status_history(job_card_id);

-- 3.3 JOB ALLOCATED PARTS
CREATE TABLE IF NOT EXISTS public.job_parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_card_id UUID NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    part_number TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_job_parts_job ON public.job_parts(job_card_id);

-- 3.4 JOB ALLOCATED LABOR
CREATE TABLE IF NOT EXISTS public.job_labor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_card_id UUID NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
    technician_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    hours NUMERIC(6, 2) NOT NULL DEFAULT 1.00,
    rate NUMERIC(10, 2) NOT NULL DEFAULT 80.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 80.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_job_labor_job ON public.job_labor(job_card_id);

-- ==============================================================================
-- 4. ESTIMATES, INVOICES & PAYMENTS
-- ==============================================================================

-- 4.1 ESTIMATES
CREATE TABLE IF NOT EXISTS public.estimates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE DEFAULT (CURRENT_DATE + INTERVAL '14 days'),
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Sent', 'Approved', 'Rejected', 'ConvertedToJob'
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.estimate_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- 'Part', 'Labor'
    description TEXT NOT NULL,
    quantity NUMERIC(8, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(10, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL
);

-- 4.2 INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    job_card_id UUID REFERENCES public.job_cards(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Partial', 'Paid', 'Void'
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Unique index on invoice_number & indexes on status, customer
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices(customer_id);

-- 4.3 INVOICE ITEMS
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- 'Part', 'Labor', 'Sublet', 'Other'
    description TEXT NOT NULL,
    quantity NUMERIC(8, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(10, 2) NOT NULL,
    total NUMERIC(12, 2) NOT NULL
);

-- 4.4 PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    payment_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    amount NUMERIC(12, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Cheque'
    reference_number TEXT,
    received_by TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

-- ==============================================================================
-- 5. APPOINTMENTS, INSPECTIONS & PHOTOS
-- ==============================================================================

-- 5.1 APPOINTMENTS
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    service_type TEXT NOT NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    bay_id UUID REFERENCES public.bays(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Confirmed', -- 'Pending', 'Confirmed', 'Arrived', 'No Show', 'Cancelled'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5.2 INSPECTIONS
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    job_card_id UUID REFERENCES public.job_cards(id) ON DELETE SET NULL,
    inspector_name TEXT NOT NULL,
    inspection_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    fuel_level TEXT DEFAULT 'Half Tank', -- 'Empty', 'Quarter', 'Half', 'Three Quarters', 'Full'
    odometer_in INTEGER,
    general_condition TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5.3 INSPECTION ITEMS (Checklist)
CREATE TABLE IF NOT EXISTS public.inspection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    panel_or_system TEXT NOT NULL, -- 'Front Bumper', 'Hood', 'Left Fender', 'Brake Pads Front', 'Engine Oil Level', etc.
    status TEXT NOT NULL, -- 'OK', 'Dented', 'Scratched', 'Repaint Needed', 'Replace Required', 'Worn'
    notes TEXT
);

-- 5.4 INSPECTION PHOTOS
CREATE TABLE IF NOT EXISTS public.inspection_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. SCRAP & SALVAGE TRADING MODULE
-- ==============================================================================

-- 6.1 SCRAP MATERIALS CATALOG
CREATE TABLE IF NOT EXISTS public.scrap_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_name TEXT NOT NULL UNIQUE, -- 'Cast Iron (حديد زهر)', 'Aluminum Rims (ألمنيوم جنوط)', 'Copper Radiator Core (نحاس)', 'Scrap Car Chassis (هيكل خردة)'
    unit_of_measure TEXT NOT NULL DEFAULT 'KG', -- 'KG', 'Metric Ton', 'Piece'
    standard_purchase_price_per_unit NUMERIC(10, 2) NOT NULL,
    standard_selling_price_per_unit NUMERIC(10, 2) NOT NULL,
    current_stock_weight NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6.2 SCRAP INTAKE (Purchases from accident vehicles / metal scrap)
CREATE TABLE IF NOT EXISTS public.scrap_intake (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intake_ticket_number TEXT NOT NULL UNIQUE,
    seller_name TEXT NOT NULL,
    seller_phone TEXT,
    source_type TEXT NOT NULL, -- 'Accident Vehicle', 'Weighbridge Bulk Metal', 'Workshop Salvage'
    vehicle_vin_or_plate TEXT,
    material_id UUID REFERENCES public.scrap_materials(id) ON DELETE SET NULL,
    weight_gross NUMERIC(12, 2) NOT NULL, -- KG
    weight_tare NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- KG
    weight_net NUMERIC(12, 2) NOT NULL, -- KG
    price_per_kg NUMERIC(10, 2) NOT NULL,
    total_cost NUMERIC(12, 2) NOT NULL,
    weighbridge_slip_number TEXT,
    intake_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    notes TEXT
);

-- 6.3 SCRAP SALES (To smelters, metal exporters, local buyers)
CREATE TABLE IF NOT EXISTS public.scrap_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_ticket_number TEXT NOT NULL UNIQUE,
    buyer_name TEXT NOT NULL,
    buyer_cr_number TEXT,
    buyer_phone TEXT,
    material_id UUID REFERENCES public.scrap_materials(id) ON DELETE RESTRICT,
    weight_sold NUMERIC(12, 2) NOT NULL,
    price_per_unit NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Paid', -- 'Paid', 'Pending'
    sale_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 7. EXPENSES & AUDIT ACTIVITY LOG
-- ==============================================================================

-- 7.1 WORKSHOP EXPENSES
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- 'Rent & Utilities', 'Consumables & Tools', 'Equipment Maintenance', 'Technician Advances', 'Permits & Municipal Fees'
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    paid_to TEXT NOT NULL,
    payment_method TEXT DEFAULT 'Cash',
    receipt_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7.2 AUDIT ACTIVITY LOG
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL, -- 'CREATE_JOB', 'ADVANCE_STATUS', 'ISSUE_INVOICE', 'STOCK_ADJUST', 'DELETE_RECORD'
    entity_type TEXT NOT NULL, -- 'job_cards', 'invoices', 'inventory', 'customers', 'vehicles'
    entity_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log(entity_type, entity_id);

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) ON EVERY TABLE
-- ==============================================================================

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrap_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrap_intake ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrap_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Grant standard authenticated staff full operational access across workshop tables
DO $$
DECLARE
    tbl text;
    tables_list text[] := ARRAY[
        'customers', 'vehicles', 'suppliers', 'bays', 'technicians',
        'inventory_items', 'stock_movements', 'purchase_orders', 'purchase_order_items',
        'job_cards', 'job_status_history', 'job_parts', 'job_labor',
        'estimates', 'estimate_items', 'invoices', 'invoice_items', 'payments',
        'appointments', 'inspections', 'inspection_items', 'inspection_photos',
        'scrap_materials', 'scrap_intake', 'scrap_sales', 'expenses', 'activity_log'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_list LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Staff access for %I" ON public.%I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Staff access for %I" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- Allow public read of scrap materials and public creation of appointments from landing page
DROP POLICY IF EXISTS "Public can view scrap materials" ON public.scrap_materials;
CREATE POLICY "Public can view scrap materials" ON public.scrap_materials FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public can book appointments" ON public.appointments;
CREATE POLICY "Public can book appointments" ON public.appointments FOR INSERT TO anon WITH CHECK (true);

-- ==============================================================================
-- 9. TRIGGERS (Auto Updated_At & Job Status Tracking)
-- ==============================================================================

-- 9.1 Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_vehicles_updated ON public.vehicles;
CREATE TRIGGER trg_vehicles_updated BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_updated ON public.inventory_items;
CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_job_cards_updated ON public.job_cards;
CREATE TRIGGER trg_job_cards_updated BEFORE UPDATE ON public.job_cards FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_updated ON public.invoices;
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 9.2 Auto insert into job_status_history whenever job_cards.status changes
CREATE OR REPLACE FUNCTION public.log_job_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.job_status_history (job_card_id, previous_status, new_status, changed_by, comments)
        VALUES (NEW.id, OLD.status, NEW.status, current_user, 'Status advanced in workshop management');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_status_audit ON public.job_cards;
CREATE TRIGGER trg_job_status_audit AFTER UPDATE ON public.job_cards FOR EACH ROW EXECUTE FUNCTION public.log_job_status_change();


-- ==============================================================================
-- 10. REALISTIC SEED DATA (Qatar Automotive & Industrial Area Context)
-- ==============================================================================

-- 10.1 WORKSHOP BAYS
INSERT INTO public.bays (bay_number, name, bay_type, is_active) VALUES
('BAY-01', 'Quick Service Bay 1', 'Quick Service', true),
('BAY-02', 'Heavy Mechanical Lift 2', 'Mechanical Lift', true),
('BAY-03', 'Wheel Alignment & Suspension', 'Alignment & Tires', true),
('BAY-04', 'Blowtherm Downdraft Paint Booth', 'Paint Booth', true),
('BAY-05', 'Celette Frame Alignment & Denting', 'Denting & Body', true)
ON CONFLICT (bay_number) DO NOTHING;

-- 10.2 TECHNICIANS
INSERT INTO public.technicians (name, phone, specialization, hourly_rate, is_available) VALUES
('Tariq Al-Mansoor', '+974 5589 1122', 'Master Mechanic', 120.00, true),
('Rajesh Kumar', '+974 6677 8899', 'Dent & Frame Specialist', 90.00, true),
('Kamal Hossain', '+974 3344 5566', 'Spray Painter', 85.00, true),
('Arnel Santos', '+974 7711 2233', 'Auto Electrician & Diagnostics', 100.00, true)
ON CONFLICT DO NOTHING;

-- 10.3 SUPPLIERS
INSERT INTO public.suppliers (name, contact_person, phone, email, address, category) VALUES
('Qatar Auto Spares Trading W.L.L', 'Hassan Mahmoud', '+974 4450 1234', 'orders@qatarautospares.qa', 'Street 10, Industrial Area, Doha', 'OEM Parts'),
('Al-Attiya Lubricants & Filtration', 'Suleiman Attiya', '+974 4460 5678', 'sales@alattiyalubes.qa', 'Salwa Road, Doha', 'Oils & Lubricants'),
('Gulf PPG & Standox Automotive Paints', 'Fadi Antoun', '+974 4470 9012', 'fadi@gulfpaints.qa', 'Street 22, Industrial Area, Doha', 'Paint & Body Materials')
ON CONFLICT DO NOTHING;

-- 10.4 CUSTOMERS
INSERT INTO public.customers (id, name, phone, email, national_id, address, customer_type) VALUES
('a0000000-0000-0000-0000-000000000001', 'Sheikh Mohammed Al-Thani', '+974 5512 3456', 'm.althani@vip.qa', '28863401234', 'The Pearl, Porto Arabia, Doha', 'Individual'),
('a0000000-0000-0000-0000-000000000002', 'Nasser Al-Kuwari', '+974 6623 4567', 'nasser.kuwari@outlook.qa', '29263405678', 'Al Waab, Villa 14, Doha', 'Individual'),
('a0000000-0000-0000-0000-000000000003', 'Al Rayyan Limousine Services', '+974 3334 5678', 'fleet@alrayyanlimo.qa', 'CR-452109', 'Old Airport Road, Doha', 'Corporate'),
('a0000000-0000-0000-0000-000000000004', 'Doha Logistics & Heavy Transport', '+974 7745 6789', 'maintenance@dohalogistics.qa', 'CR-889102', 'Industrial Area, Street 15, Doha', 'Corporate')
ON CONFLICT (id) DO NOTHING;

-- 10.5 VEHICLES
INSERT INTO public.vehicles (id, customer_id, plate_number, vin, make, model, year, color, current_mileage) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '123456', 'JTMHY05J4E4019823', 'Toyota', 'Land Cruiser V8 GXR', 2023, 'Pearl White', 42000),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '98765', 'JN8AY2NK5M9201984', 'Nissan', 'Patrol NISMO V8', 2022, 'Black Diamond', 68500),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', '50505', 'JTJHY7AX8H4092831', 'Lexus', 'LX570 Signature', 2021, 'Titanium Silver', 94000),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', '44122', 'WP1AB2AY9KDA10293', 'Porsche', 'Cayenne GTS', 2020, 'Carmine Red', 112000)
ON CONFLICT (plate_number) DO NOTHING;

-- 10.6 INVENTORY ITEMS
INSERT INTO public.inventory_items (sku, part_number, name, category, quantity, min_stock_level, unit_cost, selling_price, location) VALUES
('OIL-0W40-FS', 'MOBIL-1-0W40', 'Mobil 1 Full Synthetic 0W-40 (4L)', 'Lubricants & Fluids', 48, 12, 140.00, 220.00, 'Rack Oil-1'),
('BRK-TLC-F', '04465-60320', 'Toyota Land Cruiser Front Brake Pad Set (OEM)', 'Brakes & Suspension', 18, 6, 260.00, 420.00, 'Shelf B-02'),
('FLT-TLC-AIR', '17801-51020', 'Toyota Land Cruiser V8 Air Filter Element', 'Engine & Filters', 24, 8, 85.00, 150.00, 'Shelf A-04'),
('BRK-PAT-F', 'D1060-1LB0A', 'Nissan Patrol NISMO Front Brake Pads (OEM)', 'Brakes & Suspension', 12, 4, 320.00, 490.00, 'Shelf B-03'),
('SPK-IRID-NGK', 'ILKAR7B11', 'NGK Laser Iridium Spark Plug (Set of 8)', 'Engine & Filters', 32, 10, 220.00, 360.00, 'Shelf A-06'),
('PNT-CLR-HS', 'PPG-D800', 'PPG High Solids Clear Coat + Hardener (5L Kit)', 'Body & Paint Materials', 10, 3, 480.00, 750.00, 'Paint Storage')
ON CONFLICT (sku) DO NOTHING;

-- 10.7 SCRAP MATERIALS CATALOG
INSERT INTO public.scrap_materials (material_name, unit_of_measure, standard_purchase_price_per_unit, standard_selling_price_per_unit, current_stock_weight) VALUES
('Heavy Melt Scrap Iron (حديد ثقيل)', 'Metric Ton', 950.00, 1250.00, 14.50),
('Automotive Aluminum Wheels (جنوط ألمنيوم)', 'KG', 5.50, 7.80, 1850.00),
('Radiator Copper & Brass (نحاس راديتر)', 'KG', 18.00, 24.50, 420.00),
('Salvage Vehicle Chassis Complete (هيكل سيارة)', 'Piece', 800.00, 1400.00, 6.00)
ON CONFLICT (material_name) DO NOTHING;

-- 10.8 SAMPLE JOB CARDS
INSERT INTO public.job_cards (id, job_number, customer_id, vehicle_id, status, job_type, description, total_parts_amount, total_labor_amount, total_amount) VALUES
('c0000000-0000-0000-0000-000000000001', 'JC-2026-001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'In Progress', 'Mechanical & Service', '40,000 KM Major Service, Brake pads replacement, synthetic oil & filter change, full suspension safety inspection.', 570.00, 350.00, 920.00),
('c0000000-0000-0000-0000-000000000002', 'JC-2026-002', 'a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Painting Booth', 'Body Collision & Paint', 'Front right fender dent pull, computerized color matching, Standox primer and heated oven clear coat bake.', 250.00, 650.00, 900.00),
('c0000000-0000-0000-0000-000000000003', 'JC-2026-003', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Ready', 'Mechanical & Service', 'Check engine diagnostics, O2 sensor renewal, AC gas recharge and cooling coil sanitization.', 420.00, 280.00, 700.00)
ON CONFLICT (job_number) DO NOTHING;

-- 10.9 SAMPLE INVOICES & PAYMENTS
INSERT INTO public.invoices (id, invoice_number, job_card_id, customer_id, vehicle_id, status, subtotal, discount, total, paid_amount, balance_due) VALUES
('d0000000-0000-0000-0000-000000000001', 'INV-2026-001', 'c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Paid', 700.00, 0.00, 700.00, 700.00, 0.00)
ON CONFLICT (invoice_number) DO NOTHING;

INSERT INTO public.payments (invoice_id, amount, payment_method, reference_number, received_by) VALUES
('d0000000-0000-0000-0000-000000000001', 700.00, 'Credit Card', 'TXN-QNB-981240', 'Workshop Cashier')
ON CONFLICT DO NOTHING;
