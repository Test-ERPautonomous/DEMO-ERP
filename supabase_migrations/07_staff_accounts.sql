-- ==============================================================================
-- NAJM AL HUDA GARAGE & SCRAP TRADING - SUPABASE PHASE 7 MIGRATION
-- Migration: 07_staff_accounts.sql
-- Description: Dedicated Staff Accounts & Server-Side Sessions Table
-- Target: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. Create Dedicated Staff Accounts Table (Independent of auth.users)
CREATE TABLE IF NOT EXISTS public.staff_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'service_advisor',
    password_hash TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    last_login TIMESTAMPTZ
);

-- Indexes for fast lookup by email or username
CREATE INDEX IF NOT EXISTS idx_staff_accounts_email ON public.staff_accounts(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_staff_accounts_username ON public.staff_accounts(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_staff_accounts_active ON public.staff_accounts(is_active);

-- Constraint: Prevent staff from assigning themselves the 'owner' role
ALTER TABLE public.staff_accounts 
    DROP CONSTRAINT IF EXISTS chk_staff_not_owner;
ALTER TABLE public.staff_accounts 
    ADD CONSTRAINT chk_staff_not_owner CHECK (LOWER(role) != 'owner');

-- 2. Create Staff Active Sessions Table
CREATE TABLE IF NOT EXISTS public.staff_sessions (
    token TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.staff_accounts(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_staff_sessions_user_id ON public.staff_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_sessions_expires_at ON public.staff_sessions(expires_at);

-- 3. Row Level Security Configuration
ALTER TABLE public.staff_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_sessions ENABLE ROW LEVEL SECURITY;

-- Block anonymous public access completely
CREATE POLICY "Deny anonymous access to staff_accounts"
    ON public.staff_accounts FOR ALL
    TO anon
    USING (false);

CREATE POLICY "Deny anonymous access to staff_sessions"
    ON public.staff_sessions FOR ALL
    TO anon
    USING (false);

-- Only authenticated Workshop Owner may view and manage staff accounts
CREATE POLICY "Owner can manage staff accounts"
    ON public.staff_accounts FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND LOWER(profiles.role) = 'owner'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND LOWER(profiles.role) = 'owner'
        )
    );

-- Note: All staff authentication queries are executed server-side via the backend ERP API using trusted service credentials or scoped backend execution.
