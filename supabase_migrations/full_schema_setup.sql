-- ==============================================================================
-- NAJM AL HUDA GARAGE & SCRAP TRADING ERP - COMPLETE PRODUCTION SCHEMA
-- Single Source of Truth: Supabase Auth (auth.users) + public.profiles + ERP Tables
-- Target: Supabase PostgreSQL 15+ (Run directly in Supabase SQL Editor)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. AUTHENTICATION & PROFILES (RBAC)
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM (
        'owner',
        'admin',
        'manager',
        'service_advisor',
        'technician',
        'parts_manager',
        'cashier',
        'pending'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.app_role NOT NULL DEFAULT 'pending',
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,
    avatar_url TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Partial Unique Index: Database-enforced rule that only ONE Master Admin (owner) can exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_primary_owner ON public.profiles(role) WHERE role = 'owner';
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active);

-- Security Definer Role Helpers (Prevents RLS infinite recursion)
CREATE OR REPLACE FUNCTION public.get_current_profile_role()
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT (role IN ('owner', 'admin') AND is_active = true)
         FROM public.profiles
         WHERE id = auth.uid()),
        false
    );
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT (role NOT IN ('pending') AND is_active = true)
         FROM public.profiles
         WHERE id = auth.uid()),
        false
    );
$$;

-- Anti-Escalation Trigger on auth.users Sign-Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_full_name TEXT;
    user_phone TEXT;
BEGIN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Staff Member');
    user_phone := NEW.raw_user_meta_data->>'phone';

    -- Public signups always start as PENDING with is_active = false
    INSERT INTO public.profiles (
        id, email, full_name, role, phone, is_active, permissions
    )
    VALUES (
        NEW.id, NEW.email, user_full_name, 'pending'::public.app_role, user_phone, false, '{}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Secure Master Admin Bootstrap Function (Callable by Backend Service Role)
CREATE OR REPLACE FUNCTION public.bootstrap_master_admin_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_owner_count INTEGER;
    result_profile public.profiles;
BEGIN
    SELECT count(*) INTO existing_owner_count FROM public.profiles WHERE role = 'owner';
    IF existing_owner_count > 0 THEN
        RAISE EXCEPTION 'Master Admin setup is permanently locked. An owner account already exists.';
    END IF;

    INSERT INTO public.profiles (
        id, email, full_name, role, phone, is_active, permissions
    )
    VALUES (
        p_user_id, p_email, p_full_name, 'owner'::public.app_role, '+974 4450 8899', true,
        jsonb_build_object(
            'canViewDashboard', true,
            'canManageJobCards', true,
            'canAdvanceJobStatus', true,
            'canManageDentingPainting', true,
            'canManageInventory', true,
            'canManagePurchasesAndSales', true,
            'canViewServiceHistory', true,
            'canManageBilling', true,
            'canManageSettings', true,
            'canManageUsers', true
        )
    )
    ON CONFLICT (id) DO UPDATE
    SET role = 'owner'::public.app_role,
        is_active = true,
        full_name = EXCLUDED.full_name,
        permissions = EXCLUDED.permissions,
        updated_at = now()
    RETURNING * INTO result_profile;

    RETURN result_profile;
END;
$$;

-- ==============================================================================
-- 2. SYSTEM SETTINGS, COMPANIES & DOCUMENT SEQUENCES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY,
    company_id TEXT,
    garage_name TEXT NOT NULL DEFAULT 'NAJM AL HUDA GARAGE & SCRAP',
    garage_name_ar TEXT DEFAULT 'ورشة صيانة السيارات المتكاملة',
    tagline TEXT DEFAULT 'Automotive Workshop, Collision Repair & Parts ERP',
    address TEXT DEFAULT 'Street 24, Industrial Area',
    city_state_zip TEXT DEFAULT 'Doha, State of Qatar',
    country TEXT DEFAULT 'Qatar',
    cr_number TEXT DEFAULT 'CR No. 2026/001',
    phone TEXT DEFAULT '+974 4400 0000',
    email TEXT DEFAULT 'info@najmalhuda.qa',
    tax_id TEXT DEFAULT 'GTA Tax Card: 2026-QA-001',
    currency_symbol TEXT DEFAULT 'QAR',
    tax_rate_percent NUMERIC(5, 2) DEFAULT 0,
    default_labor_rate NUMERIC(10, 2) DEFAULT 150,
    paint_booth_hour_rate NUMERIC(10, 2) DEFAULT 200,
    data_json JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_ar TEXT,
    cr_number TEXT,
    tax_id TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    currency_symbol TEXT DEFAULT 'QAR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.document_sequences (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp-1',
    doc_type TEXT NOT NULL,
    current_number INTEGER NOT NULL DEFAULT 0,
    prefix TEXT NOT NULL,
    padding INTEGER NOT NULL DEFAULT 4,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(company_id, doc_type)
);

-- Atomic Document Sequence Allocator Function
CREATE OR REPLACE FUNCTION public.next_document_number(
    p_doc_type TEXT,
    p_company_id TEXT DEFAULT 'comp-1'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    seq_record RECORD;
    next_num INTEGER;
    allocated_code TEXT;
BEGIN
    SELECT * INTO seq_record
    FROM public.document_sequences
    WHERE doc_type = p_doc_type AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        next_num := 1;
        INSERT INTO public.document_sequences (id, company_id, doc_type, current_number, prefix, padding)
        VALUES (
            p_company_id || '_' || p_doc_type,
            p_company_id,
            p_doc_type,
            1,
            CASE p_doc_type
                WHEN 'job_card' THEN 'JC'
                WHEN 'invoice' THEN 'INV'
                WHEN 'estimate' THEN 'EST'
                WHEN 'purchase_order' THEN 'PO'
                WHEN 'goods_receipt' THEN 'GRN'
                WHEN 'counter_sale' THEN 'CS'
                WHEN 'customer' THEN 'CU'
                WHEN 'supplier' THEN 'SU'
                WHEN 'scrap_intake' THEN 'SC-IN'
                WHEN 'scrap_sale' THEN 'SC-OUT'
                ELSE UPPER(p_doc_type)
            END,
            4
        );
        allocated_code := CASE p_doc_type
            WHEN 'job_card' THEN 'JC-0001'
            WHEN 'invoice' THEN 'INV-' || to_char(now(), 'YYYY') || '-0001'
            WHEN 'estimate' THEN 'EST-0001'
            WHEN 'purchase_order' THEN 'PO-0001'
            WHEN 'goods_receipt' THEN 'GRN-0001'
            WHEN 'counter_sale' THEN 'CS-0001'
            WHEN 'customer' THEN 'CU-0001'
            WHEN 'supplier' THEN 'SU-0001'
            ELSE UPPER(p_doc_type) || '-0001'
        END;
    ELSE
        next_num := seq_record.current_number + 1;
        UPDATE public.document_sequences
        SET current_number = next_num,
            updated_at = now()
        WHERE id = seq_record.id;

        IF p_doc_type = 'invoice' THEN
            allocated_code := seq_record.prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(next_num::text, seq_record.padding, '0');
        ELSE
            allocated_code := seq_record.prefix || '-' || lpad(next_num::text, seq_record.padding, '0');
        END IF;
    END IF;

    RETURN allocated_code;
END;
$$;

-- ==============================================================================
-- 3. CORE GARAGE ENTITIES (Customers, Vehicles, Suppliers, Workshop Masters)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    qid_or_crn TEXT,
    address TEXT,
    contact_person TEXT,
    customer_type TEXT NOT NULL DEFAULT 'individual', -- 'individual', 'fleet', 'corporate'
    credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0,
    outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);

CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    plate_number TEXT NOT NULL UNIQUE,
    vin TEXT,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    color TEXT,
    mileage INTEGER DEFAULT 0,
    fuel_level INTEGER DEFAULT 50,
    body_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON public.vehicles(customer_id);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    category TEXT DEFAULT 'Auto Parts',
    payment_terms TEXT DEFAULT 'Credit 30 Days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.technicians (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    specialization TEXT NOT NULL DEFAULT 'Master Mechanic',
    assigned_bay TEXT,
    hourly_rate NUMERIC(10, 2) DEFAULT 80.00,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.bays (
    id TEXT PRIMARY KEY,
    bay_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    bay_type TEXT NOT NULL DEFAULT 'Mechanical Lift',
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.labor_rates (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    rate NUMERIC(10, 2) NOT NULL DEFAULT 150.00,
    category TEXT DEFAULT 'Mechanical'
);

CREATE TABLE IF NOT EXISTS public.paint_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    color_sample TEXT,
    manufacturer TEXT
);

-- ==============================================================================
-- 4. INVENTORY & PURCHASING
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_ar TEXT,
    category TEXT NOT NULL DEFAULT 'General Parts',
    oem_number TEXT,
    barcode TEXT,
    bin_location TEXT,
    quantity_on_hand NUMERIC(12, 2) NOT NULL DEFAULT 0,
    min_stock_level NUMERIC(12, 2) NOT NULL DEFAULT 5,
    unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unit_selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON public.inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_name ON public.inventory_items(name);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL, -- 'IN_PURCHASE', 'OUT_JOB_CARD', 'OUT_COUNTER_SALE', 'ADJUSTMENT'
    quantity NUMERIC(12, 2) NOT NULL,
    unit_cost NUMERIC(12, 2) DEFAULT 0,
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT NOT NULL UNIQUE,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    status TEXT NOT NULL DEFAULT 'Pending', -- 'Pending', 'Ordered', 'Received', 'Cancelled'
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_date DATE,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.goods_receipt_notes (
    id TEXT PRIMARY KEY,
    grn_number TEXT NOT NULL UNIQUE,
    po_id TEXT REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    received_date DATE NOT NULL DEFAULT CURRENT_DATE,
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.counter_sales (
    id TEXT PRIMARY KEY,
    sale_number TEXT NOT NULL UNIQUE,
    customer_name TEXT DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    payment_method TEXT DEFAULT 'Cash',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    items_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 5. WORKSHOP OPERATIONS & BILLING (Job Cards, Estimates, Invoices)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.job_cards (
    id TEXT PRIMARY KEY,
    job_number TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    plate_number TEXT,
    make TEXT,
    model TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Pending Inspection', 'In Progress', 'Quality Check', 'Ready for Delivery', 'Delivered', 'Closed', 'Cancelled'
    priority TEXT NOT NULL DEFAULT 'Normal',
    assigned_technician TEXT,
    assigned_bay TEXT,
    customer_concerns TEXT,
    diagnosis_notes TEXT,
    mechanical_labor_cost NUMERIC(12, 2) DEFAULT 0,
    denting_labor_cost NUMERIC(12, 2) DEFAULT 0,
    painting_cost NUMERIC(12, 2) DEFAULT 0,
    paint_booth_charge NUMERIC(12, 2) DEFAULT 0,
    parts_cost NUMERIC(12, 2) DEFAULT 0,
    consumables_cost NUMERIC(12, 2) DEFAULT 0,
    discount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    invoice_id TEXT,
    mechanical_tasks_json JSONB DEFAULT '[]'::jsonb,
    denting_painting_json JSONB DEFAULT '[]'::jsonb,
    parts_used_json JSONB DEFAULT '[]'::jsonb,
    photos_json JSONB DEFAULT '[]'::jsonb,
    dvi_checklist_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_job_cards_number ON public.job_cards(job_number);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON public.job_cards(status);

CREATE TABLE IF NOT EXISTS public.job_status_history (
    id TEXT PRIMARY KEY,
    job_card_id TEXT NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by TEXT,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.estimates (
    id TEXT PRIMARY KEY,
    estimate_number TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Approved', 'Rejected', 'Converted'
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    items_json JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    job_card_id TEXT REFERENCES public.job_cards(id) ON DELETE SET NULL,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    customer_name TEXT,
    plate_number TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE DEFAULT CURRENT_DATE,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    balance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'Unpaid', -- 'Unpaid', 'Partial', 'Paid'
    items_json JSONB DEFAULT '[]'::jsonb,
    payments_json JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(payment_status);

-- ==============================================================================
-- 6. SCRAP TRADING MODULE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.scrap_rates (
    id TEXT PRIMARY KEY,
    material_type TEXT NOT NULL UNIQUE, -- 'Copper', 'Aluminum', 'Iron', 'Batteries', 'Radiators'
    rate_per_kg NUMERIC(10, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'QAR',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.scrap_intakes (
    id TEXT PRIMARY KEY,
    intake_number TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    material_type TEXT NOT NULL,
    weight_kg NUMERIC(10, 2) NOT NULL,
    rate_per_kg NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_status TEXT DEFAULT 'Paid',
    intake_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.scrap_sales (
    id TEXT PRIMARY KEY,
    sale_number TEXT NOT NULL UNIQUE,
    buyer_name TEXT NOT NULL,
    material_type TEXT NOT NULL,
    weight_kg NUMERIC(10, 2) NOT NULL,
    rate_per_kg NUMERIC(10, 2) NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    payment_status TEXT DEFAULT 'Paid',
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 7. FINANCIAL LEDGER & AUDIT TRAIL
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Asset', 'Liability', 'Equity', 'Revenue', 'Expense'
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'QAR',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id TEXT PRIMARY KEY,
    tx_number TEXT NOT NULL UNIQUE,
    account_id TEXT REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    type TEXT NOT NULL, -- 'Income', 'Expense', 'Transfer', 'CustomerPayment', 'SupplierPayment'
    amount NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'Posted',
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.financial_allocations (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL, -- 'invoice', 'purchase_order'
    target_id TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id TEXT PRIMARY KEY,
    entry_number TEXT NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference TEXT,
    description TEXT,
    lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT,
    role TEXT,
    module TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    reference_id TEXT,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) HARDENING & LEAST PRIVILEGE
-- ==============================================================================

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, public;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated, public;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT SELECT ON public.settings TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant standard permissions to authenticated users
DO $$
DECLARE
    tbl text;
    erp_tables text[] := ARRAY[
        'profiles', 'settings', 'companies', 'document_sequences',
        'customers', 'vehicles', 'suppliers', 'inventory_items', 'stock_movements',
        'purchase_orders', 'goods_receipt_notes', 'job_cards', 'job_status_history',
        'invoices', 'estimates', 'counter_sales', 'scrap_rates', 'scrap_intakes',
        'scrap_sales', 'technicians', 'bays', 'labor_rates', 'paint_codes',
        'financial_accounts', 'financial_transactions', 'financial_allocations',
        'journal_entries', 'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY erp_tables LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', tbl);
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Service role full access on %I" ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Service role full access on %I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- Public branding policy
CREATE POLICY "Anon read workshop branding settings" ON public.settings FOR SELECT TO anon USING (id = 'primary');
CREATE POLICY "Authenticated read workshop branding settings" ON public.settings FOR SELECT TO authenticated USING (id = 'primary');
CREATE POLICY "Admins manage settings" ON public.settings FOR ALL TO authenticated USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Active staff can view staff profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_active_staff() AND is_active = true);
CREATE POLICY "Users can update own basic profile details" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid() AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins and Owners can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());

-- Operational tables policy (Active Staff Only)
DO $$
DECLARE
    tbl text;
    op_tables text[] := ARRAY[
        'customers', 'vehicles', 'suppliers', 'inventory_items', 'stock_movements',
        'purchase_orders', 'goods_receipt_notes', 'job_cards', 'job_status_history',
        'invoices', 'estimates', 'counter_sales', 'scrap_rates', 'scrap_intakes',
        'scrap_sales', 'technicians', 'bays', 'labor_rates', 'paint_codes',
        'companies', 'document_sequences'
    ];
BEGIN
    FOREACH tbl IN ARRAY op_tables LOOP
        EXECUTE format('CREATE POLICY "Active staff can view %I" ON public.%I FOR SELECT TO authenticated USING (public.is_active_staff());', tbl, tbl);
        EXECUTE format('CREATE POLICY "Active staff can manage %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());', tbl, tbl);
        EXECUTE format('CREATE POLICY "Active staff can update %I" ON public.%I FOR UPDATE TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());', tbl, tbl);
        EXECUTE format('CREATE POLICY "Admins can delete %I" ON public.%I FOR DELETE TO authenticated USING (public.is_admin_or_owner());', tbl, tbl);
    END LOOP;
END $$;

-- Financials policy
CREATE POLICY "Staff view financial accounts" ON public.financial_accounts FOR SELECT TO authenticated USING (public.is_active_staff());
CREATE POLICY "Admins manage financial accounts" ON public.financial_accounts FOR ALL TO authenticated USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());

CREATE POLICY "Staff view financial transactions" ON public.financial_transactions FOR SELECT TO authenticated USING (public.is_active_staff());
CREATE POLICY "Staff insert financial transactions" ON public.financial_transactions FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());
CREATE POLICY "Admins manage financial transactions" ON public.financial_transactions FOR UPDATE TO authenticated USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());
CREATE POLICY "Admins delete financial transactions" ON public.financial_transactions FOR DELETE TO authenticated USING (public.is_admin_or_owner());

CREATE POLICY "Staff view financial allocations" ON public.financial_allocations FOR SELECT TO authenticated USING (public.is_active_staff());
CREATE POLICY "Staff manage financial allocations" ON public.financial_allocations FOR ALL TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());

CREATE POLICY "Staff view journal entries" ON public.journal_entries FOR SELECT TO authenticated USING (public.is_active_staff());
CREATE POLICY "Admins manage journal entries" ON public.journal_entries FOR ALL TO authenticated USING (public.is_admin_or_owner()) WITH CHECK (public.is_admin_or_owner());

-- Audit logs
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin_or_owner());
CREATE POLICY "Staff append audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());

-- ==============================================================================
-- 9. DEFAULT BASELINE SETTINGS INITIALIZATION
-- ==============================================================================

INSERT INTO public.settings (
    id, company_id, garage_name, garage_name_ar, tagline, address, city_state_zip, country, cr_number, phone, email, tax_id, currency_symbol, default_labor_rate, paint_booth_hour_rate
) VALUES (
    'primary', 'comp-1', 'NAJM AL HUDA GARAGE & SCRAP', 'ورشة صيانة السيارات المتكاملة', 'Automotive Workshop, Collision Repair & Parts ERP', 'Street 24, Industrial Area', 'Doha, State of Qatar', 'Qatar', 'CR No. 2026/001', '+974 4400 0000', 'info@najmalhuda.qa', 'GTA Tax Card: 2026-QA-001', 'QAR', 150, 200
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.companies (
    id, code, name, name_ar, cr_number, phone, email, currency_symbol, is_active
) VALUES (
    'comp-1', 'NAJM', 'NAJM AL HUDA GARAGE & SCRAP', 'ورشة صيانة السيارات المتكاملة', 'CR No. 2026/001', '+974 4400 0000', 'info@najmalhuda.qa', 'QAR', true
) ON CONFLICT (id) DO NOTHING;

-- Initial scrap rates
INSERT INTO public.scrap_rates (id, material_type, rate_per_kg, currency) VALUES
    ('rate-1', 'Copper', 28.50, 'QAR'),
    ('rate-2', 'Aluminum', 7.20, 'QAR'),
    ('rate-3', 'Iron / Heavy Steel', 1.15, 'QAR'),
    ('rate-4', 'Lead Batteries', 3.80, 'QAR'),
    ('rate-5', 'Brass', 18.00, 'QAR')
ON CONFLICT (id) DO NOTHING;
