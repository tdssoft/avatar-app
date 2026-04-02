-- Add is_draft column to recommendations table
-- Used to mark AI-generated drafts that need admin review before sending to patient

ALTER TABLE public.recommendations
ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

-- Make created_by_admin_id nullable so AI auto-drafts (with no admin author) can be inserted
ALTER TABLE public.recommendations
ALTER COLUMN created_by_admin_id DROP NOT NULL;

-- Update patient SELECT policy to exclude drafts (patients must not see drafts)
DROP POLICY IF EXISTS "Users can view own recommendations" ON public.recommendations;

CREATE POLICY "Users can view own recommendations"
ON public.recommendations FOR SELECT
USING (
    is_draft = false
    AND EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.id = patient_id AND p.user_id = auth.uid()
    )
);

COMMENT ON COLUMN public.recommendations.is_draft IS
  'true = AI-generated draft awaiting admin review; false = published recommendation visible to patient';
