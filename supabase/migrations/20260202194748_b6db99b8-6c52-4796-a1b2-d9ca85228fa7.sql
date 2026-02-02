-- Add tags column to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create nutrition_interview_history table
CREATE TABLE IF NOT EXISTS public.nutrition_interview_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.nutrition_interviews(id) ON DELETE CASCADE,
  content jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now()
);

-- Enable RLS on history table
ALTER TABLE public.nutrition_interview_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage interview history
CREATE POLICY "Admins can manage interview history"
ON public.nutrition_interview_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own interview history
CREATE POLICY "Users can view own interview history"
ON public.nutrition_interview_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM nutrition_interviews ni
    JOIN person_profiles pp ON ni.person_profile_id = pp.id
    WHERE ni.id = nutrition_interview_history.interview_id
    AND pp.account_user_id = auth.uid()
  )
);