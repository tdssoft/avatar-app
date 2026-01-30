export interface Referral {
  id: string;
  referrerCode: string;
  referredUserId: string;
  referredEmail: string;
  referredName: string;
  status: "pending" | "active";
  createdAt: string;
  activatedAt?: string;
}

export const getReferralsByCode = (referralCode: string): Referral[] => {
  const referrals = JSON.parse(localStorage.getItem("avatar_referrals") || "[]");
  return referrals.filter((r: Referral) => r.referrerCode === referralCode);
};

export const activateReferral = (referredUserId: string): boolean => {
  const referrals = JSON.parse(localStorage.getItem("avatar_referrals") || "[]");
  const index = referrals.findIndex((r: Referral) => r.referredUserId === referredUserId);
  
  if (index !== -1) {
    referrals[index].status = "active";
    referrals[index].activatedAt = new Date().toISOString();
    localStorage.setItem("avatar_referrals", JSON.stringify(referrals));
    return true;
  }
  return false;
};

export const getReferralStats = (referralCode: string) => {
  const referrals = getReferralsByCode(referralCode);
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
