-- Phase 3 Migration: Full Job Card Workflow, Digital Inspection, Photos, and Stock Deduction Trigger

-- 1. Create Job Status History Table
CREATE TABLE IF NOT EXISTS public.job_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_card_id UUID NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    changed_by TEXT NOT NULL DEFAULT 'System',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for status history lookups
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_card_id ON public.job_status_history(job_card_id);

-- 2. Create Digital Vehicle Inspections (DVI) Table
CREATE TABLE IF NOT EXISTS public.digital_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_card_id UUID NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pass', 'Attention', 'Critical', 'NA')),
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_inspections_job_card_id ON public.digital_inspections(job_card_id);

-- 3. Create Job Photos Table (Before, After, DVI, Damage)
CREATE TABLE IF NOT EXISTS public.job_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_card_id UUID NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('before', 'after', 'dvi', 'damage')),
    description TEXT,
    uploaded_by TEXT DEFAULT 'Technician',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_photos_job_card_id ON public.job_photos(job_card_id);

-- 4. Automatic Stock Deduction Trigger Function
CREATE OR REPLACE FUNCTION public.trg_deduct_inventory_for_job_part()
RETURNS TRIGGER AS $$
DECLARE
    v_item_name TEXT;
    v_old_qty NUMERIC := 0;
    v_diff NUMERIC := 0;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_diff := NEW.quantity;
    ELSIF TG_OP = 'UPDATE' THEN
        v_diff := NEW.quantity - OLD.quantity;
    END IF;

    IF v_diff != 0 AND NEW.inventory_item_id IS NOT NULL THEN
        -- Get item name for log
        SELECT name INTO v_item_name FROM public.inventory_items WHERE id = NEW.inventory_item_id;

        -- Deduct from inventory_items
        UPDATE public.inventory_items
        SET quantity_on_hand = GREATEST(0, quantity_on_hand - v_diff),
            updated_at = NOW()
        WHERE id = NEW.inventory_item_id;

        -- Log stock movement
        INSERT INTO public.stock_movements (
            inventory_item_id,
            movement_type,
            quantity,
            reference_type,
            reference_id,
            notes,
            created_at
        ) VALUES (
            NEW.inventory_item_id,
            'Job_Issue',
            v_diff,
            'JobCard',
            NEW.job_card_id,
            'Issued for Job Card part usage',
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on job_parts
DROP TRIGGER IF EXISTS trg_job_parts_inventory_deduct ON public.job_parts;
CREATE TRIGGER trg_job_parts_inventory_deduct
AFTER INSERT OR UPDATE ON public.job_parts
FOR EACH ROW
EXECUTE FUNCTION public.trg_deduct_inventory_for_job_part();

-- 5. Row Level Security Policies
ALTER TABLE public.job_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read job_status_history" ON public.job_status_history FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert job_status_history" ON public.job_status_history FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read digital_inspections" ON public.digital_inspections FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated manage digital_inspections" ON public.digital_inspections FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated read job_photos" ON public.job_photos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated manage job_photos" ON public.job_photos FOR ALL USING (auth.role() = 'authenticated');
