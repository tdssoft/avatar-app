import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ACTIVE_PROFILE_CHANGED_EVENT,
  ACTIVE_PROFILE_STORAGE_KEY,
} from "@/hooks/usePersonProfiles";

type FlowStatus = {
  isLoading: boolean;
  hasPaidPlan: boolean;
  hasInterview: boolean;
  hasInterviewDraft: boolean;
  interviewStatus: "none" | "draft" | "sent";
  hasResults: boolean;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "aktywna",
  "active",
  "paid",
]);

const isActiveSubscription = (status: string | null | undefined): boolean =>
  ACTIVE_SUBSCRIPTION_STATUSES.has((status ?? "").trim().toLowerCase());

export const useUserFlowStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<FlowStatus>({
    isLoading: true,
    hasPaidPlan: false,
    hasInterview: false,
    hasInterviewDraft: false,
    interviewStatus: "none",
    hasResults: false,
  });

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setStatus({
        isLoading: false,
        hasPaidPlan: false,
        hasInterview: false,
        hasInterviewDraft: false,
        interviewStatus: "none",
        hasResults: false,
      });
      return;
    }

    setStatus((prev) => ({ ...prev, isLoading: true }));

    try {
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id, subscription_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (patientError) {
        console.error("[useUserFlowStatus] patients read error", patientError);
      }

      const subscriptionStatus = patient?.subscription_status ?? "";
      const hasPaidPlan = isActiveSubscription(subscriptionStatus);

      const { data: profiles, error: profilesError } = await supabase
        .from("person_profiles")
        .select("id, is_primary")
        .eq("account_user_id", user.id);
      if (profilesError) {
        console.error("[useUserFlowStatus] profiles read error", profilesError);
      }

      const profileRows = profiles ?? [];
      const storedActiveProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
      const activeProfile =
        profileRows.find((p) => p.id === storedActiveProfileId) ??
        profileRows.find((p) => p.is_primary) ??
        profileRows[0];
      const activeProfileId = activeProfile?.id ?? null;

      let interviewStatus: "none" | "draft" | "sent" = "none";
      if (activeProfileId) {
        const { data: latestInterview, error: interviewError } = await supabase
          .from("nutrition_interviews")
          .select("status, last_updated_at")
          .eq("person_profile_id", activeProfileId)
          .order("last_updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (interviewError) {
          console.error("[useUserFlowStatus] interview read error", interviewError);
        } else if (latestInterview?.status === "sent" || latestInterview?.status === "draft") {
          interviewStatus = latestInterview.status;
        }
      }

      const hasInterview = interviewStatus === "sent";
      const hasInterviewDraft = interviewStatus === "draft";

      let hasResults = false;
      if (patient?.id) {
        const { count } = await supabase
          .from("recommendations")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", patient.id);
        hasResults = (count ?? 0) > 0;
      }

      setStatus({
        isLoading: false,
        hasPaidPlan,
        hasInterview,
        hasInterviewDraft,
        interviewStatus,
        hasResults,
      });
    } catch (error) {
      console.error("[useUserFlowStatus] error", error);
      setStatus((prev) => ({ ...prev, isLoading: false }));
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleProfileChanged = () => {
      refresh();
    };

    window.addEventListener(ACTIVE_PROFILE_CHANGED_EVENT, handleProfileChanged);
    window.addEventListener("focus", handleProfileChanged);

    return () => {
      window.removeEventListener(ACTIVE_PROFILE_CHANGED_EVENT, handleProfileChanged);
      window.removeEventListener("focus", handleProfileChanged);
    };
  }, [refresh]);

  return {
    ...status,
    refresh,
  };
};
