import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ACTIVE_PROFILE_CHANGED_EVENT,
  ACTIVE_PROFILE_STORAGE_KEY,
} from "@/hooks/usePersonProfiles";

type FlowStatus = {
  isLoading: boolean;
  isFlowResolved: boolean;
  hasPaidPlanForActiveProfile: boolean;
  hasPaidPlan: boolean;
  hasInterview: boolean;
  hasInterviewDraft: boolean;
  interviewStatus: "none" | "draft" | "sent";
  hasResults: boolean;
};

export const useUserFlowStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<FlowStatus>({
    isLoading: true,
    isFlowResolved: false,
    hasPaidPlanForActiveProfile: false,
    hasPaidPlan: false,
    hasInterview: false,
    hasInterviewDraft: false,
    interviewStatus: "none",
    hasResults: false,
  });
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setStatus({
        isLoading: false,
        isFlowResolved: true,
        hasPaidPlanForActiveProfile: false,
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
      const prevStatus = statusRef.current;

      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("id, subscription_status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (patientError) {
        console.error("[useUserFlowStatus] patients read error", patientError);
      }

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

      if (activeProfileId) {
        localStorage.setItem(ACTIVE_PROFILE_STORAGE_KEY, activeProfileId);
      } else {
        localStorage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
      }

      let hasPaidPlanForActiveProfile = prevStatus.hasPaidPlanForActiveProfile;
      let profileAccessError: unknown = null;
      if (!profilesError && activeProfileId) {
        const { data: activeAccess, error } = await supabase
          .from("profile_access")
          .select("id")
          .eq("person_profile_id", activeProfileId)
          .eq("account_user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle();
        if (error) {
          profileAccessError = error;
          console.error("[useUserFlowStatus] profile_access read error", error);
          hasPaidPlanForActiveProfile = prevStatus.hasPaidPlanForActiveProfile;
        } else {
          hasPaidPlanForActiveProfile = Boolean(activeAccess?.id);
        }
      } else if (!profilesError && !activeProfileId) {
        hasPaidPlanForActiveProfile = false;
      }

      let interviewStatus: "none" | "draft" | "sent" = prevStatus.interviewStatus;
      if (!profilesError && activeProfileId) {
        const { data: latestInterview, error: interviewError } = await supabase
          .from("nutrition_interviews")
          .select("status, last_updated_at")
          .eq("person_profile_id", activeProfileId)
          .order("last_updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (interviewError) {
          console.error("[useUserFlowStatus] interview read error", interviewError);
          interviewStatus = prevStatus.interviewStatus;
        } else if (latestInterview?.status === "sent" || latestInterview?.status === "draft") {
          interviewStatus = latestInterview.status;
        } else {
          interviewStatus = "none";
        }
      } else if (!profilesError && !activeProfileId) {
        interviewStatus = "none";
      }

      const hasInterview = interviewStatus === "sent";
      const hasInterviewDraft = interviewStatus === "draft";

      let hasResults = prevStatus.hasResults;
      if (!patientError && patient?.id) {
        const { count } = await supabase
          .from("recommendations")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", patient.id);
        hasResults = (count ?? 0) > 0;
      } else if (!patientError && !patient?.id) {
        hasResults = false;
      }

      setStatus({
        isLoading: false,
        isFlowResolved: !patientError && !profilesError && !profileAccessError,
        hasPaidPlanForActiveProfile,
        hasPaidPlan: hasPaidPlanForActiveProfile,
        hasInterview,
        hasInterviewDraft,
        interviewStatus,
        hasResults,
      });
    } catch (error) {
      console.error("[useUserFlowStatus] error", error);
      setStatus((prev) => ({ ...prev, isLoading: false, isFlowResolved: false }));
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
