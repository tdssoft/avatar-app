-- Add unique index on profiles.referral_code (partial - only non-null/non-empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_referral_code_unique 
ON public.profiles (referral_code) 
WHERE referral_code IS NOT NULL AND referral_code <> '';

-- Add unique index on referrals.referred_user_id (one referrer per user)
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_referred_user_id_unique 
ON public.referrals (referred_user_id);