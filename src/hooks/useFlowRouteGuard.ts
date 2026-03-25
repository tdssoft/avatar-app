import { useMemo } from "react";
import { useUserFlowStatus } from "@/hooks/useUserFlowStatus";
import { useAuth } from "@/contexts/AuthContext";
import {
  deriveFlowState,
  resolveFlowRedirectTarget,
} from "@/hooks/flowRouteGuard";

export const useFlowRouteGuard = (pathname: string) => {
  const { isLoading, isFlowResolved, hasPaidPlanForActiveProfile, hasInterview } = useUserFlowStatus();
  const { isLoading: isAuthLoading, user } = useAuth();

  const flowState = useMemo(
    () => deriveFlowState(hasPaidPlanForActiveProfile, hasInterview),
    [hasInterview, hasPaidPlanForActiveProfile],
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
    hasPaidPlan: hasPaidPlanForActiveProfile,
    hasPaidPlanForActiveProfile,
    hasInterview,
  };
};
