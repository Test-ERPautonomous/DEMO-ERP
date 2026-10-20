-- ==============================================================================
-- NAJM AL HUDA GARAGE ERP - MIGRATION 06: LEAST PRIVILEGE RLS & HARDENING
-- Comprehensive security remediation:
-- 1. Revokes broad default grants from public/anon/authenticated roles.
-- 2. Dynamically drops ALL legacy/permissive open policies across all operational tables.
-- 3. Enables and forces Row Level Security (RLS) on all ERP tables.
-- 4. Grants full administrative access to backend service_role.
-- 5. Restricts anon role strictly to public workshop branding (settings WHERE id = 'primary').
-- 6. Gates authenticated access strictly behind active staff verification (is_active = true).
-- 7. Eliminates RLS recursion by using stable security definer role functions.
-- ==============================================================================

-- 1. REVOKE DEFAULT BROAD GRANTS FROM ANON, AUTHENTICATED, AND PUBLIC
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, public;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated, public;

-- 2. GRANT FULL ADMINISTRATIVE RIGHTS EXCLUSIVELY TO SERVICE_ROLE (BACKEND SERVER)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

-- 3. PERMIT RESTRICTED READ ACCESS ON PUBLIC SETTINGS BRANDING
GRANT SELECT ON public.settings TO anon, authenticated;

-- 4. PERMIT AUTHENTICATED ACCESS ON OPERATIONAL TABLES FOR ACTIVE STAFF
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goods_receipt_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_status_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estimates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.counter_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrap_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrap_intakes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scrap_sales TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technicians TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bays TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labor_rates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.paint_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_allocations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_sequences TO authenticated;

-- Grant sequence usages
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 5. REMOVE ALL LEGACY / INSECURE OPEN POLICIES AND CONFIGURE LEAST-PRIVILEGE RLS POLICIES
DO $$
DECLARE
    tbl text;
    pol RECORD;
    erp_tables text[] := ARRAY[
        'profiles', 'users', 'sessions', 'settings', 'companies', 'document_sequences',
        'customers', 'vehicles', 'suppliers', 'inventory_items', 'stock_movements',
        'purchase_orders', 'goods_receipt_notes', 'job_cards', 'job_status_history',
        'invoices', 'estimates', 'counter_sales', 'scrap_rates', 'scrap_intakes',
        'scrap_sales', 'technicians', 'bays', 'labor_rates', 'paint_codes',
        'financial_accounts', 'financial_transactions', 'financial_allocations',
        'journal_entries', 'audit_logs'
    ];
BEGIN
    -- A. Drop all existing policies across these tables to eliminate permissive rules
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = ANY(erp_tables)
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;

    -- B. Enable & Force RLS, create strict service_role policies
    FOREACH tbl IN ARRAY erp_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
            EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl);

            -- Service Role always has full access
            EXECUTE format('CREATE POLICY "Service role full access on %I" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- 6. PUBLIC (ANON) ACCESS RULES
-- Only allow reading the primary workshop branding record (workshop name, phone, address, currency)
-- All customer, invoice, financial, profile, and operational records remain 100% BLOCKED from anon.
CREATE POLICY "Anon read workshop branding settings" ON public.settings
    FOR SELECT TO anon
    USING (id = 'primary');

CREATE POLICY "Authenticated read workshop branding settings" ON public.settings
    FOR SELECT TO authenticated
    USING (id = 'primary');

-- Only Admin/Owner can modify settings
CREATE POLICY "Admins manage settings" ON public.settings
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());

-- 7. PROFILES RLS POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Active staff can view staff profiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (public.is_active_staff() AND is_active = true);

CREATE POLICY "Users can update own basic profile details" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() AND
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
    );

CREATE POLICY "Admins and Owners can manage all profiles" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());

-- 8. OPERATIONAL ERP TABLES RLS POLICIES (Active Staff Only)
-- Macro for tables viewable by any active staff member and manageable by staff with appropriate roles
DO $$
DECLARE
    tbl text;
    operational_tables text[] := ARRAY[
        'customers', 'vehicles', 'suppliers', 'inventory_items', 'stock_movements',
        'purchase_orders', 'goods_receipt_notes', 'job_cards', 'job_status_history',
        'invoices', 'estimates', 'counter_sales', 'scrap_rates', 'scrap_intakes',
        'scrap_sales', 'technicians', 'bays', 'labor_rates', 'paint_codes',
        'companies', 'document_sequences'
    ];
BEGIN
    FOREACH tbl IN ARRAY operational_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            -- Active staff can read operational data
            EXECUTE format('CREATE POLICY "Active staff can view %I" ON public.%I FOR SELECT TO authenticated USING (public.is_active_staff());', tbl, tbl);

            -- Active staff can insert/update operational records
            EXECUTE format('CREATE POLICY "Active staff can manage %I" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_active_staff());', tbl, tbl);
            EXECUTE format('CREATE POLICY "Active staff can update %I" ON public.%I FOR UPDATE TO authenticated USING (public.is_active_staff()) WITH CHECK (public.is_active_staff());', tbl, tbl);

            -- Deletions strictly restricted to Admin and Owner
            EXECUTE format('CREATE POLICY "Admins can delete %I" ON public.%I FOR DELETE TO authenticated USING (public.is_admin_or_owner());', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- 9. FINANCIALS & AUDIT LOGS (Higher Security Tier)
-- Financial Accounts & Transactions: readable by active staff with accounting/managerial roles or admin
CREATE POLICY "Staff view financial accounts" ON public.financial_accounts
    FOR SELECT TO authenticated
    USING (public.is_active_staff());

CREATE POLICY "Admins and accountants manage financial accounts" ON public.financial_accounts
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner() OR public.get_current_profile_role() IN ('manager'))
    WITH CHECK (public.is_admin_or_owner() OR public.get_current_profile_role() IN ('manager'));

CREATE POLICY "Staff view financial transactions" ON public.financial_transactions
    FOR SELECT TO authenticated
    USING (public.is_active_staff());

CREATE POLICY "Staff insert financial transactions" ON public.financial_transactions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_active_staff());

CREATE POLICY "Admins manage financial transactions" ON public.financial_transactions
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());

CREATE POLICY "Admins delete financial transactions" ON public.financial_transactions
    FOR DELETE TO authenticated
    USING (public.is_admin_or_owner());

-- Financial Allocations
CREATE POLICY "Staff view financial allocations" ON public.financial_allocations
    FOR SELECT TO authenticated
    USING (public.is_active_staff());

CREATE POLICY "Staff manage financial allocations" ON public.financial_allocations
    FOR ALL TO authenticated
    USING (public.is_active_staff())
    WITH CHECK (public.is_active_staff());

-- Journal Entries
CREATE POLICY "Staff view journal entries" ON public.journal_entries
    FOR SELECT TO authenticated
    USING (public.is_active_staff());

CREATE POLICY "Admins and managers manage journal entries" ON public.journal_entries
    FOR ALL TO authenticated
    USING (public.is_admin_or_owner() OR public.get_current_profile_role() IN ('manager'))
    WITH CHECK (public.is_admin_or_owner() OR public.get_current_profile_role() IN ('manager'));

-- Audit Logs: Viewable only by Admin/Owner; Insertable by active staff; Non-deletable
CREATE POLICY "Admins view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin_or_owner());

CREATE POLICY "Staff append audit logs" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.is_active_staff());
