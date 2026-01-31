-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert referrals" ON public.referrals;

-- Create a more secure INSERT policy - only authenticated users can insert
-- and referred_user_id must match their own ID (prevents spoofing)
CREATE POLICY "Authenticated users can create referrals for themselves"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id);