export type FlowState = "NO_PLAN" | "PLAN_NO_INTERVIEW" | "READY";

export const deriveFlowState = (
  hasPaidPlan: boolean,
  hasInterview: boolean,
): FlowState => {
  if (!hasPaidPlan) return "NO_PLAN";
  if (!hasInterview) return "PLAN_NO_INTERVIEW";
  return "READY";
};

const normalizePath = (pathname: string): string => {
  if (!pathname) return "/";
  const base = pathname.split("?")[0];
  return base.length > 1 && base.endsWith("/") ? base.slice(0, -1) : base;
};

const isPaymentPath = (pathname: string): boolean =>
  pathname === "/payment" || pathname.startsWith("/payment/");

const isInterviewPath = (pathname: string): boolean =>
  pathname === "/interview" ||
  pathname.startsWith("/interview/") ||
  pathname === "/dashboard/interview";

const isDashboardPath = (pathname: string): boolean =>
  pathname === "/dashboard" || pathname.startsWith("/dashboard/");

export const resolveFlowRedirectTarget = (
  pathname: string,
  flowState: FlowState,
): string | null => {
  const path = normalizePath(pathname);

  if (flowState === "NO_PLAN") {
    if (path === "/dashboard") return null;
    if (isPaymentPath(path)) return null;
    if (isDashboardPath(path) || isInterviewPath(path)) return "/dashboard";
    return null;
  }

  if (flowState === "PLAN_NO_INTERVIEW") {
    if (path === "/dashboard") return null;
    if (isInterviewPath(path)) return null;
    if (isPaymentPath(path)) return "/interview";
    if (isDashboardPath(path)) return "/interview";
    return null;
  }

  if (isPaymentPath(path)) return "/dashboard";
  return null;
};
