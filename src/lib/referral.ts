import { supabase } from "@/integrations/supabase/client";

export interface Referral {
  id: string;
  referrer_code: string;
  referred_user_id: string;
  referred_email: string;
  referred_name: string;
  status: "pending" | "active";
  created_at: string;
  activated_at?: string;
}

export const getReferralsByCode = async (referralCode: string): Promise<Referral[]> => {
  const { data, error } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_code", referralCode)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching referrals:", error);
    return [];
  }

  return (data || []).map((r) => ({
    id: r.id,
    referrer_code: r.referrer_code,
    referred_user_id: r.referred_user_id,
    referred_email: r.referred_email,
    referred_name: r.referred_name,
    status: r.status as "pending" | "active",
    created_at: r.created_at,
    activated_at: r.activated_at || undefined,
  }));
};

export const getReferralStats = async (referralCode: string) => {
  const referrals = await getReferralsByCode(referralCode);
  return {
    total: referrals.length,
    pending: referrals.filter((r) => r.status === "pending").length,
    active: referrals.filter((r) => r.status === "active").length,
  };
};

export const generateReferralLink = (referralCode: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/signup?ref=${referralCode}`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};
