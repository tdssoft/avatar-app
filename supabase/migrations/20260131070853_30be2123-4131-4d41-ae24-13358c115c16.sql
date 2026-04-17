-- Create referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referrer_code text NOT NULL,
  referred_user_id uuid NOT NULL,
  referred_email text NOT NULL,
  referred_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  activated_at timestamptz
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view referrals they made
CREATE POLICY "Users can view referrals they made"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_user_id);

-- Policy: Allow inserting referrals (needed during signup)
CREATE POLICY "Anyone can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

-- Add referral_code column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code text;

-- Create index for fast referral code lookup
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);