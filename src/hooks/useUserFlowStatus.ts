import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type FlowStatus = {
  isLoading: boolean;
  hasPaidPlan: boolean;
  hasInterview: boolean;
  hasResults: boolean;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "Aktywna",
  "active",
  "paid",
]);

export const useUserFlowStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<FlowStatus>({
    isLoading: true,
    hasPaidPlan: false,
    hasInterview: false,
    hasResults: false,
  });

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setStatus({ isLoading: false, hasPaidPlan: false, hasInterview: false, hasResults: false });
      return;
    }

    setStatus((prev) => ({ ...prev, isLoading: true }));

    try {
      const { data: patient } = await supabase
        .from("patients")
        .select("id, subscription_status")
        .eq("user_id", user.id)
        .maybeSingle();

      const localPaid = localStorage.getItem("avatar_payment_completed") === "true";
      const subscriptionStatus = patient?.subscription_status ?? "";
      const hasPaidPlan = localPaid || ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus);

      const { data: profiles } = await supabase
        .from("person_profiles")
        .select("id")
        .eq("account_user_id", user.id);

      const profileIds = (profiles ?? []).map((p) => p.id);

      let hasInterview = false;
      if (profileIds.length > 0) {
        const { count } = await supabase
          .from("nutrition_interviews")
          .select("id", { count: "exact", head: true })
          .in("person_profile_id", profileIds)
          .eq("status", "sent");
        hasInterview = (count ?? 0) > 0;
      }

      let hasResults = false;
      if (patient?.id) {
        const { count } = await supabase
          .from("recommendations")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", patient.id);
        hasResults = (count ?? 0) > 0;
      }

      setStatus({ isLoading: false, hasPaidPlan, hasInterview, hasResults });
    } catch (error) {
      console.error("[useUserFlowStatus] error", error);
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...status,
    refresh,
  };
};
