import { useMemo } from "react";
import { useUserFlowStatus } from "@/hooks/useUserFlowStatus";
import {
  deriveFlowState,
  resolveFlowRedirectTarget,
} from "@/hooks/flowRouteGuard";

export const useFlowRouteGuard = (pathname: string) => {
  const { isLoading, isFlowResolved, hasPaidPlanForActiveProfile, hasInterview } = useUserFlowStatus();

  const flowState = useMemo(
    () => deriveFlowState(hasPaidPlanForActiveProfile, hasInterview),
    [hasInterview, hasPaidPlanForActiveProfile],
  );

  const redirectTo = useMemo(() => {
    if (isLoading || !isFlowResolved) return null;
    return resolveFlowRedirectTarget(pathname, flowState);
  }, [flowState, isFlowResolved, isLoading, pathname]);

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
