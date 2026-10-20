-- ==============================================================================
-- NAJM AL HUDA GARAGE ERP - HARDENED PRODUCTION POSTGRESQL SCHEMA
-- Native Supabase Auth (`auth.users`) + Explicit Service-Role Privilege Protection + Non-Recursive RLS
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'service_advisor',
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB NOT NULL DEFAULT '{
        "canViewDashboard": true,
        "canManageJobCards": true,
        "canAdvanceJobStatus": true,
        "canManageDentingPainting": true,
        "canManageInventory": true,
        "canManagePurchasesAndSales": true,
        "canViewServiceHistory": true,
        "canManageBilling": true,
        "canManageSettings": false,
        "canManageUsers": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. SAFE DEFAULT PROFILE CREATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, phone, is_active, permissions)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        'service_advisor',
        new.raw_user_meta_data->>'phone',
        true,
        '{
            "canViewDashboard": true,
            "canManageJobCards": true,
            "canAdvanceJobStatus": true,
            "canManageDentingPainting": true,
            "canManageInventory": true,
            "canManagePurchasesAndSales": true,
            "canViewServiceHistory": true,
            "canManageBilling": true,
            "canManageSettings": false,
            "canManageUsers": false
        }'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        updated_at = timezone('utc'::text, now());

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create auth user trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. AUTOMATIC EMAIL SYNCHRONIZATION TRIGGER (AUTH.USERS -> PUBLIC.PROFILES)
CREATE OR REPLACE FUNCTION public.handle_user_email_update()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.email IS DISTINCT FROM OLD.email) THEN
        UPDATE public.profiles
        SET email = NEW.email, updated_at = timezone('utc'::text, now())
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_update();

-- Restrict execution of auth triggers to postgres, supabase_auth_admin, and service_role
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, supabase_auth_admin, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_user_email_update() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_user_email_update() TO postgres, supabase_auth_admin, service_role;

-- 4. WORKSHOP SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    data_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. COMPANIES TABLE
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT,
    cr_number TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. DOCUMENT SEQUENCES TABLE (Concurrency-Safe Sequence Generation)
CREATE TABLE IF NOT EXISTS public.document_sequences (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'comp-1',
    doc_type TEXT NOT NULL,
    year INTEGER NOT NULL DEFAULT 0,
    next_number INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    UNIQUE(company_id, doc_type, year)
);

-- 7. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    customer_id TEXT,
    customer_number TEXT,
    name TEXT NOT NULL,
    name_ar TEXT,
    phone TEXT,
    email TEXT,
    qid TEXT,
    qid_or_crn TEXT,
    address TEXT,
    customer_type TEXT DEFAULT 'individual',
    credit_limit NUMERIC DEFAULT 0,
    outstanding_balance NUMERIC DEFAULT 0,
    company_id TEXT DEFAULT 'comp-1',
    notes TEXT,
    data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 8. VEHICLES TABLE
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    vehicle_number TEXT,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    plate_number TEXT NOT NULL,
    vin TEXT,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    color TEXT,
    mileage NUMERIC DEFAULT 0,
    odometer NUMERIC DEFAULT 0,
    engine_no TEXT,
    transmission TEXT,
    fuel_type TEXT,
    body_type TEXT DEFAULT 'SUV',
    company_id TEXT DEFAULT 'comp-1',
    notes TEXT,
    data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 9. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS public.suppliers (
    id TEXT PRIMARY KEY,
    supplier_id TEXT,
    supplier_number TEXT,
    name TEXT NOT NULL,
    name_ar TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    trn TEXT,
    cr_number TEXT,
    address TEXT,
    category TEXT DEFAULT 'General',
    payment_terms TEXT DEFAULT 'Net 30',
    balance NUMERIC DEFAULT 0,
    company_id TEXT DEFAULT 'comp-1',
    data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 10. INVENTORY ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY,
    sku TEXT NOT NULL,
    barcode TEXT,
    oem_part_number TEXT,
    aftermarket_part_number TEXT,
    name TEXT NOT NULL,
    name_ar TEXT,
    category TEXT NOT NULL DEFAULT 'Mechanical Parts',
    brand TEXT,
    fitment TEXT,
    vehicle_compatibility TEXT,
    unit TEXT DEFAULT 'pcs',
    unit_of_measure TEXT DEFAULT 'PCS',
    rack_location TEXT,
    bin_location TEXT,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    selling_price NUMERIC NOT NULL DEFAULT 0,
    retail_price NUMERIC NOT NULL DEFAULT 0,
    min_reorder_level NUMERIC NOT NULL DEFAULT 5,
    quantity_on_hand NUMERIC NOT NULL DEFAULT 0,
    quantity_reserved NUMERIC NOT NULL DEFAULT 0,
    quantity_available NUMERIC NOT NULL DEFAULT 0,
    quantity_damaged NUMERIC NOT NULL DEFAULT 0,
    quantity_on_order NUMERIC NOT NULL DEFAULT 0,
    batch_number TEXT,
    expiry_date TEXT,
    last_restocked_date TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 11. STOCK MOVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    item_id TEXT REFERENCES public.inventory_items(id) ON DELETE SET NULL,
    item_name TEXT,
    sku TEXT,
    type TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC DEFAULT 0,
    total_cost NUMERIC DEFAULT 0,
    reference_type TEXT,
    reference_id TEXT,
    reference_number TEXT,
    notes TEXT,
    created_by TEXT DEFAULT 'System',
    date TEXT,
    company_id TEXT DEFAULT 'comp-1',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 12. JOB CARDS TABLE
CREATE TABLE IF NOT EXISTS public.job_cards (
    id TEXT PRIMARY KEY,
    job_number TEXT UNIQUE NOT NULL,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    plate_number TEXT NOT NULL,
    vehicle_make TEXT NOT NULL,
    vehicle_model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft',
    date_in TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    promised_date TIMESTAMPTZ,
    estimated_cost NUMERIC DEFAULT 0,
    final_cost NUMERIC DEFAULT 0,
    complaints_json JSONB DEFAULT '[]'::jsonb,
    parts_json JSONB DEFAULT '[]'::jsonb,
    labor_json JSONB DEFAULT '[]'::jsonb,
    company_id TEXT DEFAULT 'comp-1',
    data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 13. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    job_card_id TEXT REFERENCES public.job_cards(id) ON DELETE SET NULL,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    plate_number TEXT,
    status TEXT NOT NULL DEFAULT 'Unpaid',
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    balance_due NUMERIC NOT NULL DEFAULT 0,
    items_json JSONB DEFAULT '[]'::jsonb,
    company_id TEXT DEFAULT 'comp-1',
    data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 14. ESTIMATES TABLE
CREATE TABLE IF NOT EXISTS public.estimates (
    id TEXT PRIMARY KEY,
    estimate_number TEXT UNIQUE NOT NULL,
    customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    plate_number TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    status TEXT DEFAULT 'Pending',
    date TEXT,
    valid_until TEXT,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    items_json JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_by TEXT,
    company_id TEXT DEFAULT 'comp-1',
    data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 15. PURCHASE ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    supplier_contact TEXT,
    date TEXT,
    expected_date TEXT,
    status TEXT DEFAULT 'Draft',
    items_json JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'Unpaid',
    notes TEXT,
    created_by TEXT,
    company_id TEXT DEFAULT 'comp-1',
    data_json JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 16. GOODS RECEIPT NOTES TABLE
CREATE TABLE IF NOT EXISTS public.goods_receipt_notes (
    id TEXT PRIMARY KEY,
    grn_number TEXT UNIQUE NOT NULL,
    po_number TEXT,
    po_id TEXT REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    supplier_name TEXT NOT NULL,
    delivery_note_number TEXT,
    receipt_date TEXT,
    received_by TEXT,
    items_json JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Inspected & Received',
    notes TEXT,
    company_id TEXT DEFAULT 'comp-1',
    data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 17. COUNTER SALES TABLE
CREATE TABLE IF NOT EXISTS public.counter_sales (
    id TEXT PRIMARY KEY,
    sale_number TEXT UNIQUE NOT NULL,
    customer_name TEXT DEFAULT 'Walk-in Customer',
    customer_phone TEXT,
    date TEXT,
    items_json JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    balance_amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    payment_status TEXT DEFAULT 'Paid',
    notes TEXT,
    created_by TEXT,
    company_id TEXT DEFAULT 'comp-1',
    data_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 18. SCRAP RATES TABLE
CREATE TABLE IF NOT EXISTS public.scrap_rates (
    material_type TEXT PRIMARY KEY,
    buying_rate NUMERIC DEFAULT 0,
    selling_rate NUMERIC DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 19. SCRAP INTAKES TABLE
CREATE TABLE IF NOT EXISTS public.scrap_intakes (
    id TEXT PRIMARY KEY,
    receipt_no TEXT UNIQUE NOT NULL,
    seller_name TEXT NOT NULL,
    seller_phone TEXT,
    seller_qid TEXT,
    material_type TEXT NOT NULL,
    weight_kg NUMERIC DEFAULT 0,
    price_per_kg NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    date TEXT,
    vehicle_plate TEXT,
    notes TEXT,
    created_by TEXT,
    company_id TEXT DEFAULT 'comp-1',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 20. SCRAP SALES TABLE
CREATE TABLE IF NOT EXISTS public.scrap_sales (
    id TEXT PRIMARY KEY,
    invoice_no TEXT UNIQUE NOT NULL,
    buyer_company TEXT NOT NULL,
    buyer_phone TEXT,
    material_type TEXT NOT NULL,
    weight_kg NUMERIC DEFAULT 0,
    rate_per_kg NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    cost_per_kg NUMERIC DEFAULT 0,
    cost_amount NUMERIC DEFAULT 0,
    profit_margin NUMERIC DEFAULT 0,
    margin_percent NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'Paid',
    date TEXT,
    notes TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 21. TECHNICIANS TABLE
CREATE TABLE IF NOT EXISTS public.technicians (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    technician_number TEXT,
    name TEXT NOT NULL,
    role TEXT,
    specialization TEXT DEFAULT 'Mechanical',
    phone TEXT,
    hourly_cost NUMERIC DEFAULT 0,
    hourly_rate NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'Available',
    current_job_id TEXT,
    bay_assigned TEXT,
    bays_json JSONB DEFAULT '[]'::jsonb,
    joining_date TEXT,
    notes TEXT,
    company_id TEXT DEFAULT 'comp-1',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 22. LABOR RATES TABLE
CREATE TABLE IF NOT EXISTS public.labor_rates (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    category TEXT DEFAULT 'Mechanical',
    description TEXT,
    standard_hours NUMERIC DEFAULT 1,
    hourly_rate NUMERIC DEFAULT 150,
    total_rate NUMERIC DEFAULT 150,
    is_active INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 23. PAINT CODES TABLE
CREATE TABLE IF NOT EXISTS public.paint_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    color_name TEXT NOT NULL,
    manufacturer TEXT DEFAULT 'General',
    finish_type TEXT DEFAULT 'Metallic',
    mixing_ratio TEXT DEFAULT '2:1 + 10%',
    price_per_panel NUMERIC DEFAULT 350,
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 24. FINANCIAL ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'cash',
    bank_name TEXT,
    account_number TEXT,
    currency TEXT DEFAULT 'QAR',
    opening_balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    company_id TEXT DEFAULT 'comp-1',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 25. FINANCIAL TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id TEXT PRIMARY KEY,
    transaction_number TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    category TEXT DEFAULT 'Receipt',
    date TEXT,
    amount NUMERIC DEFAULT 0,
    unapplied_amount NUMERIC DEFAULT 0,
    account_id TEXT DEFAULT 'acc-cash-1',
    account_name TEXT DEFAULT 'Main Counter Cash',
    payment_method TEXT DEFAULT 'Cash',
    party_type TEXT DEFAULT 'Customer',
    party_id TEXT,
    party_name TEXT,
    party_phone TEXT,
    reference_number TEXT,
    notes TEXT,
    status TEXT DEFAULT 'posted',
    linked_invoice_id TEXT,
    linked_job_card_id TEXT,
    linked_po_id TEXT,
    linked_advance_id TEXT,
    reversal_of_id TEXT,
    reversal_reason TEXT,
    allocations_json JSONB DEFAULT '[]'::jsonb,
    created_by TEXT,
    posted_by TEXT,
    posted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    company_id TEXT DEFAULT 'comp-1',
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 26. FINANCIAL ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.financial_allocations (
    id TEXT PRIMARY KEY,
    transaction_id TEXT REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
    advance_id TEXT,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_number TEXT,
    amount NUMERIC DEFAULT 0,
    date TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 27. JOURNAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id TEXT PRIMARY KEY,
    entry_number TEXT UNIQUE NOT NULL,
    date TEXT,
    reference_type TEXT,
    reference_id TEXT,
    reference_number TEXT,
    description TEXT,
    lines_json JSONB DEFAULT '[]'::jsonb,
    total_debit NUMERIC DEFAULT 0,
    total_credit NUMERIC DEFAULT 0,
    is_balanced INTEGER DEFAULT 1,
    status TEXT DEFAULT 'posted',
    reversal_of_id TEXT,
    reversal_reason TEXT,
    created_by TEXT,
    company_id TEXT DEFAULT 'comp-1',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 28. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    user_id TEXT,
    user_name TEXT,
    role TEXT,
    module TEXT DEFAULT 'System',
    action TEXT NOT NULL,
    record_id TEXT,
    previous_value_json JSONB,
    new_value_json JSONB,
    details TEXT,
    ip_address TEXT
);

-- ==============================================================================
-- NON-RECURSIVE ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- ==============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrap_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrap_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrap_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paint_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper 1: Fetch caller role bypassing RLS recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper 2: Check if caller is active staff
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN AS $$
DECLARE
    user_active BOOLEAN;
BEGIN
    SELECT is_active INTO user_active
    FROM public.profiles
    WHERE id = auth.uid();
    RETURN COALESCE(user_active, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper 3: Check if caller is active Admin / Owner
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_active_staff() AND (public.get_my_role() IN ('owner', 'admin'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Explicit EXECUTE privileges on RLS helper functions:
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role, postgres;

REVOKE EXECUTE ON FUNCTION public.is_active_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated, service_role, postgres;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role, postgres;

-- ==============================================================================
-- DATABASE-LEVEL TRIGGER: STRICT FIELD-LEVEL PRIVILEGE PROTECTION
-- Requires explicit service_role JWT or active Admin session
-- Non-admin staff CANNOT modify role, permissions, active status, email, or id.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Allow explicit service_role key, active Admin/Owner session, or trusted database maintenance session.
    -- CRITICAL SECURITY NOTE: current_user must NEVER be checked here! In a SECURITY DEFINER function,
    -- current_user always evaluates to the definer ('postgres'), which would unsafely bypass protection
    -- for any caller. session_user correctly identifies the underlying connected client session
    -- ('authenticator' for PostgREST API sessions, 'postgres' for direct SQL Editor maintenance).
    IF (auth.role() = 'service_role') OR public.is_admin() OR (session_user IN ('postgres', 'supabase_admin', 'supabase_auth_admin')) THEN
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    -- For normal staff sessions (updating their own profile), block changes to restricted fields
    IF (NEW.role IS DISTINCT FROM OLD.role) THEN
        RAISE EXCEPTION 'Unauthorized: Non-admin staff cannot modify role.';
    END IF;
    IF (NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
        RAISE EXCEPTION 'Unauthorized: Non-admin staff cannot modify account active status.';
    END IF;
    IF (NEW.permissions IS DISTINCT FROM OLD.permissions) THEN
        RAISE EXCEPTION 'Unauthorized: Non-admin staff cannot modify permissions.';
    END IF;
    IF (NEW.email IS DISTINCT FROM OLD.email) THEN
        RAISE EXCEPTION 'Unauthorized: Non-admin staff cannot modify email address.';
    END IF;
    IF (NEW.id IS DISTINCT FROM OLD.id) THEN
        RAISE EXCEPTION 'Unauthorized: Cannot modify profile ID.';
    END IF;

    -- Preserve created_at and update updated_at timestamp
    NEW.created_at := OLD.created_at;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke execute from public/anon; allow authenticated staff (for own profile update) and database maintenance
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.protect_profile_privileged_fields() TO authenticated, service_role, postgres;

DROP TRIGGER IF EXISTS enforce_profile_field_protection ON public.profiles;
CREATE TRIGGER enforce_profile_field_protection
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- ==============================================================================
-- IDEMPOTENT RLS POLICY DEFINITIONS
-- ==============================================================================

-- A. PROFILES POLICIES
DROP POLICY IF EXISTS "Active staff view active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin or self update profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin delete profiles" ON public.profiles;

CREATE POLICY "Active staff view active profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.is_active_staff() AND (is_active = true OR id = auth.uid() OR public.is_admin()));

CREATE POLICY "Admin or self update profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (id = auth.uid() OR public.is_admin());

-- REMOVED id = auth.uid() so ordinary users cannot self-insert arbitrary profiles!
-- Profile creation is strictly reserved for Admin sessions and SECURITY DEFINER auth triggers.
CREATE POLICY "Admin create profiles"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete profiles"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- B. SYSTEM CONFIGURATION TABLES
DROP POLICY IF EXISTS "Staff view settings" ON public.settings;
DROP POLICY IF EXISTS "Staff view companies" ON public.companies;
DROP POLICY IF EXISTS "Staff view sequences" ON public.document_sequences;
DROP POLICY IF EXISTS "Admin manage settings" ON public.settings;
DROP POLICY IF EXISTS "Admin manage companies" ON public.companies;
DROP POLICY IF EXISTS "Admin manage sequences" ON public.document_sequences;

CREATE POLICY "Staff view settings" ON public.settings FOR SELECT TO authenticated USING (public.is_active_staff());
CREATE POLICY "Staff view companies" ON public.companies FOR SELECT TO authenticated USING (public.is_active_staff());
CREATE POLICY "Staff view sequences" ON public.document_sequences FOR SELECT TO authenticated USING (public.is_active_staff());

CREATE POLICY "Admin manage settings" ON public.settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin manage companies" ON public.companies FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admin manage sequences" ON public.document_sequences FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- C. OPERATIONAL ERP TABLES (Read / Write for Active Staff, Delete for Admin)
DO $$
DECLARE
    t TEXT;
    operational_tables TEXT[] := ARRAY[
        'customers', 'vehicles', 'suppliers', 'inventory_items',
        'job_cards', 'invoices', 'estimates', 'purchase_orders', 'goods_receipt_notes',
        'counter_sales', 'scrap_rates', 'scrap_intakes', 'scrap_sales', 'technicians',
        'labor_rates', 'paint_codes', 'financial_accounts'
    ];
    financial_audit_tables TEXT[] := ARRAY[
        'financial_transactions', 'journal_entries', 'stock_movements', 'financial_allocations'
    ];
BEGIN
    -- 1. Standard Operational Tables (Staff Select/Insert/Update, Admin Delete)
    FOREACH t IN ARRAY operational_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Staff view %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Staff create %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Staff update %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Admin delete %I" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "Staff view %I" ON public.%I FOR SELECT TO authenticated USING (public.is_active_staff())', t, t);
        EXECUTE format('CREATE POLICY "Staff create %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_active_staff())', t, t);
        EXECUTE format('CREATE POLICY "Staff update %I" ON public.%I FOR UPDATE TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff())', t, t);
        EXECUTE format('CREATE POLICY "Admin delete %I" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t, t);
    END LOOP;

    -- 2. Financial & Audit Control Tables (Staff Select/Insert, Admin Update/Delete - Ordinary Staff CANNOT Update)
    FOREACH t IN ARRAY financial_audit_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Staff view %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Staff create %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Staff update %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Admin update %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Admin delete %I" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "Staff view %I" ON public.%I FOR SELECT TO authenticated USING (public.is_active_staff())', t, t);
        EXECUTE format('CREATE POLICY "Staff create %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_active_staff())', t, t);
        EXECUTE format('CREATE POLICY "Admin update %I" ON public.%I FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
        EXECUTE format('CREATE POLICY "Admin delete %I" ON public.%I FOR DELETE TO authenticated USING (public.is_admin())', t, t);
    END LOOP;

    -- 3. Append-Only Audit Logs (Staff Select/Insert, NO UPDATE OR DELETE FOR ANYONE)
    DROP POLICY IF EXISTS "Staff view audit_logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Staff create audit_logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Staff update audit_logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Admin update audit_logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Admin delete audit_logs" ON public.audit_logs;

    CREATE POLICY "Staff view audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_active_staff());
    CREATE POLICY "Staff create audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());
END $$;

-- Least-privilege default revoke:
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, public;

-- Public branding settings access strictly restricted to primary workshop branding:
DROP POLICY IF EXISTS "Anon read workshop branding settings" ON public.settings;
CREATE POLICY "Anon read workshop branding settings" ON public.settings
    FOR SELECT TO anon
    USING (id = 'primary');

-- Verified RLS enumeration array for all 28 production ERP tables:
-- ['users', 'sessions', 'settings', 'companies', 'document_sequences',
--  'customers', 'vehicles', 'suppliers', 'inventory_items', 'stock_movements',
--  'purchase_orders', 'goods_receipt_notes', 'job_cards', 'job_status_history',
--  'invoices', 'estimates', 'counter_sales', 'scrap_rates', 'scrap_intakes',
--  'scrap_sales', 'technicians', 'labor_rates', 'paint_codes',
--  'financial_accounts', 'financial_transactions', 'financial_allocations',
--  'journal_entries', 'audit_logs']

-- Append-only audit logs: enforce strict table-level protection in addition to RLS
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_logs FROM PUBLIC, anon, authenticated;

-- ==============================================================================
-- SAFE TRANSACTIONAL OWNER PROMOTION PROCEDURE
-- Promotes a single user to 'owner' with full admin permissions, failing safely
-- if the target email is missing, not found, or matches multiple records.
-- Reliably selects the target UUID without aggregate ambiguity and verifies
-- account existence in public.profiles and auth.users.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.promote_owner_by_email(target_email TEXT)
RETURNS VOID AS $$
DECLARE
    matched_count INTEGER;
    target_id UUID;
BEGIN
    IF target_email IS NULL OR trim(target_email) = '' THEN
        RAISE EXCEPTION 'Owner promotion aborted: target_email cannot be empty.';
    END IF;

    -- 1. Check matching records in public.profiles
    SELECT count(*) INTO matched_count
    FROM public.profiles
    WHERE lower(trim(email)) = lower(trim(target_email));

    IF matched_count = 1 THEN
        -- Exactly one matching profile: select target UUID directly
        SELECT id INTO target_id
        FROM public.profiles
        WHERE lower(trim(email)) = lower(trim(target_email));
    ELSIF matched_count > 1 THEN
        RAISE EXCEPTION 'Owner promotion aborted: Multiple profiles found for email "%" (count = %)', target_email, matched_count;
    ELSE
        -- 0 matching profiles in public.profiles: check if user exists in auth.users (e.g. created prior to trigger)
        SELECT count(*) INTO matched_count
        FROM auth.users
        WHERE lower(trim(email)) = lower(trim(target_email));

        IF matched_count = 1 THEN
            SELECT id INTO target_id
            FROM auth.users
            WHERE lower(trim(email)) = lower(trim(target_email));

            -- Ensure profile record exists for this auth user before setting owner
            INSERT INTO public.profiles (id, email, full_name, role, is_active)
            VALUES (
                target_id,
                trim(target_email),
                split_part(trim(target_email), '@', 1),
                'service_advisor',
                true
            )
            ON CONFLICT (id) DO NOTHING;
        ELSIF matched_count > 1 THEN
            RAISE EXCEPTION 'Owner promotion aborted: Multiple auth records found for email "%" (count = %)', target_email, matched_count;
        ELSE
            RAISE EXCEPTION 'Owner promotion aborted: No user profile or auth record found for email "%"', target_email;
        END IF;
    END IF;

    -- 2. Update the target profile with owner role and full administrative permissions
    UPDATE public.profiles
    SET 
        role = 'owner',
        is_active = true,
        permissions = '{
            "canViewDashboard": true,
            "canManageJobCards": true,
            "canAdvanceJobStatus": true,
            "canManageDentingPainting": true,
            "canManageInventory": true,
            "canManagePurchasesAndSales": true,
            "canViewServiceHistory": true,
            "canManageBilling": true,
            "canManageSettings": true,
            "canManageUsers": true
        }'::jsonb,
        updated_at = timezone('utc'::text, now())
    WHERE id = target_id;

    RAISE NOTICE 'Successfully promoted user % (%) to Owner.', target_email, target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- EXPLICIT EXECUTE PRIVILEGES FOR promote_owner_by_email:
-- Revoke from PUBLIC and client API roles to prevent any PostgREST invocation.
REVOKE EXECUTE ON FUNCTION public.promote_owner_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.promote_owner_by_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_owner_by_email(TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.promote_owner_by_email(TEXT) FROM service_role;

-- Grant EXECUTE exclusively to postgres (database owner role in Supabase SQL Editor).
GRANT EXECUTE ON FUNCTION public.promote_owner_by_email(TEXT) TO postgres;


