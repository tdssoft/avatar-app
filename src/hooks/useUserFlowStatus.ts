import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ACTIVE_PROFILE_CHANGED_EVENT,
  ACTIVE_PROFILE_STORAGE_KEY,
} from "@/hooks/usePersonProfiles";
import { flowDebugEnd, flowDebugStart } from "@/lib/perf/flowDebug";

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

type CachedFlowStatus = {
  status: FlowStatus;
  updatedAt: number;
};

const flowStatusCache = new Map<string, CachedFlowStatus>();
const flowStatusInFlight = new Map<string, Promise<FlowStatus>>();

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
  const STALE_TIME_MS = 30_000;

  type RefreshOptions = {
    force?: boolean;
  };

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const refresh = useCallback(async (options?: RefreshOptions) => {
    if (!user?.id) {
      // No user yet — mark as NOT resolved so the guard waits for the real user load.
      // isFlowResolved: false means useFlowRouteGuard returns redirectTo=null, preventing
      // a premature redirect before the second refresh() (with the real user ID) completes.
      setStatus({
        isLoading: false,
        isFlowResolved: false,
        hasPaidPlanForActiveProfile: false,
        hasPaidPlan: false,
        hasInterview: false,
        hasInterviewDraft: false,
        interviewStatus: "none",
        hasResults: false,
      });
      return;
    }

    const force = options?.force === true;
    const storedActiveProfileId = localStorage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
    const cacheKey = `${user.id}:${storedActiveProfileId ?? "none"}`;
    const now = Date.now();
    const cached = flowStatusCache.get(cacheKey);

    if (!force && cached && now - cached.updatedAt < STALE_TIME_MS) {
      setStatus(cached.status);
      return;
    }

    const inFlight = flowStatusInFlight.get(cacheKey);
    if (!force && inFlight) {
      const inFlightStatus = await inFlight;
      setStatus(inFlightStatus);
      return;
    }

    setStatus((prev) => ({ ...prev, isLoading: true }));

    try {
      const prevStatus = statusRef.current;
      const perfMark = flowDebugStart(`refresh:${cacheKey}`);

      const requestPromise = (async (): Promise<FlowStatus> => {
        const [{ data: patient, error: patientError }, { data: profiles, error: profilesError }] =
          await Promise.all([
            supabase
              .from("patients")
              .select("id")
              .eq("user_id", user.id)
              .maybeSingle(),
            supabase
              .from("person_profiles")
              .select("id, is_primary")
              .eq("account_user_id", user.id),
          ]);

        if (patientError) {
          console.error("[useUserFlowStatus] patients read error", patientError);
        }
        if (profilesError) {
          console.error("[useUserFlowStatus] profiles read error", profilesError);
        }

        const profileRows = profiles ?? [];
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
        let interviewStatus: "none" | "draft" | "sent" = prevStatus.interviewStatus;

        if (!profilesError && activeProfileId) {
          const [{ data: activeAccess, error: accessError }, { data: latestInterview, error: interviewError }] =
            await Promise.all([
              supabase
                .from("profile_access")
                .select("id")
                .eq("person_profile_id", activeProfileId)
                .eq("account_user_id", user.id)
                .eq("status", "active")
                .limit(1)
                .maybeSingle(),
              supabase
                .from("nutrition_interviews")
                .select("status, last_updated_at")
                .eq("person_profile_id", activeProfileId)
                .order("last_updated_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
            ]);

          if (accessError) {
            profileAccessError = accessError;
            console.error("[useUserFlowStatus] profile_access read error", accessError);
            hasPaidPlanForActiveProfile = prevStatus.hasPaidPlanForActiveProfile;
          } else {
            hasPaidPlanForActiveProfile = Boolean(activeAccess?.id);
          }

          if (interviewError) {
            console.error("[useUserFlowStatus] interview read error", interviewError);
            interviewStatus = prevStatus.interviewStatus;
          } else if (latestInterview?.status === "sent" || latestInterview?.status === "draft") {
            interviewStatus = latestInterview.status;
          } else {
            interviewStatus = "none";
          }
        } else if (!profilesError && !activeProfileId) {
          hasPaidPlanForActiveProfile = false;
          interviewStatus = "none";
        }

        const nextStatus: FlowStatus = {
          isLoading: false,
          isFlowResolved: !patientError && !profilesError && !profileAccessError,
          hasPaidPlanForActiveProfile,
          hasPaidPlan: hasPaidPlanForActiveProfile,
          hasInterview: interviewStatus === "sent",
          hasInterviewDraft: interviewStatus === "draft",
          interviewStatus,
          hasResults: prevStatus.hasResults,
        };

        const resolvedKey = `${user.id}:${activeProfileId ?? "none"}`;
        flowStatusCache.set(cacheKey, { status: nextStatus, updatedAt: Date.now() });
        flowStatusCache.set(resolvedKey, { status: nextStatus, updatedAt: Date.now() });
        flowDebugEnd(`refresh:${cacheKey}`, perfMark);
        return nextStatus;
      })();

      flowStatusInFlight.set(cacheKey, requestPromise);
      const nextStatus = await requestPromise;
      setStatus(nextStatus);
    } catch (error) {
      console.error("[useUserFlowStatus] error", error);
      setStatus((prev) => ({ ...prev, isLoading: false, isFlowResolved: false }));
    } finally {
      flowStatusInFlight.delete(cacheKey);
    }
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleProfileChanged = () => {
      refresh({ force: true });
    };

    window.addEventListener(ACTIVE_PROFILE_CHANGED_EVENT, handleProfileChanged);

    return () => {
      window.removeEventListener(ACTIVE_PROFILE_CHANGED_EVENT, handleProfileChanged);
    };
  }, [refresh]);

  return {
    ...status,
    refresh,
  };
};
