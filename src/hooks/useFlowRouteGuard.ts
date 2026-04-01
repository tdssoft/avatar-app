import { useMemo } from "react";
import { useUserFlowStatus } from "@/hooks/useUserFlowStatus";
import { useAuth } from "@/contexts/AuthContext";
import {
  deriveFlowState,
  resolveFlowRedirectTarget,
} from "@/hooks/flowRouteGuard";

export const useFlowRouteGuard = (pathname: string) => {
  const { isLoading, isFlowResolved, hasPaidPlanForActiveProfile, hasPaidPlanForAccount, hasPaidPlan, hasInterview } = useUserFlowStatus();
  const { isLoading: isAuthLoading, user } = useAuth();

  const flowState = useMemo(
    // Use hasPaidPlan (effective value: true if active profile OR any account profile has paid access)
    // so that child profiles added to a family account are not blocked by NO_PLAN state.
    () => deriveFlowState(hasPaidPlan, hasInterview),
    [hasInterview, hasPaidPlan],
  );

  const redirectTo = useMemo(() => {
    // Wait for both auth and flow to fully resolve before computing any redirect.
    // Without this guard, the initial refresh() with user=null sets isFlowResolved=true
    // and hasPaidPlanForActiveProfile=false (NO_PLAN) before the real user loads,
    // causing a premature redirect before the second refresh() (with real user ID) completes.
    if (isAuthLoading || !user?.id || isLoading || !isFlowResolved) return null;
    return resolveFlowRedirectTarget(pathname, flowState);
  }, [flowState, isFlowResolved, isLoading, isAuthLoading, user?.id, pathname]);

  return {
    isLoading,
    isFlowResolved,
    flowState,
    redirectTo,
    hasPaidPlan,
    hasPaidPlanForActiveProfile,
    hasPaidPlanForAccount,
    hasInterview,
  };
};
