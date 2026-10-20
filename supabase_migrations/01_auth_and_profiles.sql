-- ==============================================================================
-- NAJM AL HUDA GARAGE & SCRAP TRADING - SUPABASE PHASE 1 MIGRATION
-- Migration: 01_auth_and_profiles.sql
-- Description: Core RBAC Roles, User Profiles, Anti-Escalation Triggers, RLS
-- Target: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. Create Role Enum
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

-- 2. Create Profiles Table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.app_role NOT NULL DEFAULT 'pending', -- Default is PENDING, never owner
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT false,        -- Inactive until approved by Master Admin
    avatar_url TEXT,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Partial Unique Index: Guarantees at database level that only ONE Master Admin (owner) can exist
CREATE UNIQUE INDEX IF NOT EXISTS idx_single_primary_owner ON public.profiles(role) WHERE role = 'owner';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active);

-- 3. Security Definer Helper Functions (Avoid RLS Recursion)
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

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Service Role (Backend Server) has full access
DROP POLICY IF EXISTS "Service role full access on profiles" ON public.profiles;
CREATE POLICY "Service role full access on profiles"
    ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated users can view their own profile (even if pending)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Active staff can view other active staff profiles
DROP POLICY IF EXISTS "Active staff can view staff profiles" ON public.profiles;
CREATE POLICY "Active staff can view staff profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (public.is_active_staff() AND is_active = true);

-- Users can update ONLY their own phone and avatar (cannot change role, is_active, or permissions)
DROP POLICY IF EXISTS "Users can update own basic profile details" ON public.profiles;
CREATE POLICY "Users can update own basic profile details"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() AND
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        is_active = (SELECT is_active FROM public.profiles WHERE id = auth.uid())
    );

-- Admins and Owners can manage all profiles
DROP POLICY IF EXISTS "Admins and Owners can manage all profiles" ON public.profiles;
CREATE POLICY "Admins and Owners can manage all profiles"
    ON public.profiles
    FOR ALL
    TO authenticated
    USING (public.is_admin_or_owner())
    WITH CHECK (public.is_admin_or_owner());

-- 5. Anti-Privilege Escalation Trigger on auth.users Sign-Up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_full_name TEXT;
    user_phone TEXT;
    has_existing_owner BOOLEAN;
BEGIN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Staff Member');
    user_phone := NEW.raw_user_meta_data->>'phone';

    -- SECURITY CRITICAL: Public signups are ALWAYS assigned 'pending' role and is_active = false.
    -- They NEVER receive owner or admin privileges, regardless of what role was submitted in client metadata.
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        phone,
        is_active,
        permissions
    )
    VALUES (
        NEW.id,
        NEW.email,
        user_full_name,
        'pending'::public.app_role,
        user_phone,
        false,
        '{}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Secure One-Time Master Admin Bootstrap Function (Callable only by Service Role or DB Admin)
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
    -- Concurrency check: Ensure no owner already exists
    SELECT count(*) INTO existing_owner_count
    FROM public.profiles
    WHERE role = 'owner';

    IF existing_owner_count > 0 THEN
        RAISE EXCEPTION 'Master Admin setup is permanently locked. An owner account already exists.';
    END IF;

    -- Upsert the Master Admin profile with owner role and active status
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        phone,
        is_active,
        permissions
    )
    VALUES (
        p_user_id,
        p_email,
        p_full_name,
        'owner'::public.app_role,
        '+974 4450 8899',
        true,
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

-- 7. Service Inquiries Table (For Landing Page Contact Form)
CREATE TABLE IF NOT EXISTS public.service_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_info TEXT NOT NULL,
    service_type TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new', -- 'new', 'contacted', 'booked', 'closed'
    source TEXT NOT NULL DEFAULT 'landing_page',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.service_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_inquiries FORCE ROW LEVEL SECURITY;

-- Public (anon) can only submit inquiries
DROP POLICY IF EXISTS "Public can submit service inquiries" ON public.service_inquiries;
CREATE POLICY "Public can submit service inquiries"
    ON public.service_inquiries
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Only active workshop staff can view inquiries
DROP POLICY IF EXISTS "Active staff can view service inquiries" ON public.service_inquiries;
CREATE POLICY "Active staff can view service inquiries"
    ON public.service_inquiries
    FOR SELECT
    TO authenticated
    USING (public.is_active_staff());

-- Only admins/managers can update inquiries
DROP POLICY IF EXISTS "Admins and managers can update service inquiries" ON public.service_inquiries;
CREATE POLICY "Admins and managers can update service inquiries"
    ON public.service_inquiries
    FOR UPDATE
    TO authenticated
    USING (public.is_admin_or_owner());
