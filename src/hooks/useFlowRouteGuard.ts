import { useMemo } from "react";
import { useUserFlowStatus } from "@/hooks/useUserFlowStatus";
import {
  deriveFlowState,
  resolveFlowRedirectTarget,
} from "@/hooks/flowRouteGuard";

export const useFlowRouteGuard = (pathname: string) => {
  const { isLoading, hasPaidPlan, hasInterview } = useUserFlowStatus();

  const flowState = useMemo(
    () => deriveFlowState(hasPaidPlan, hasInterview),
    [hasInterview, hasPaidPlan],
  );

  const redirectTo = useMemo(() => {
    if (isLoading) return null;
    return resolveFlowRedirectTarget(pathname, flowState);
  }, [flowState, isLoading, pathname]);

  return {
    isLoading,
    flowState,
    redirectTo,
    hasPaidPlan,
    hasInterview,
  };
};
