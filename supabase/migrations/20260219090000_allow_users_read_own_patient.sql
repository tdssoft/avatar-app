-- Allow authenticated users to read their own patient row.
-- Required for dashboard flow state (subscription/interview/results) for non-admin users.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patients'
      AND policyname = 'Users can view own patient row'
  ) THEN
    CREATE POLICY "Users can view own patient row"
      ON public.patients
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END;
$$;
