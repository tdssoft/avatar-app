import { describe, expect, it } from "vitest";
import { deriveFlowState, resolveFlowRedirectTarget } from "@/hooks/flowRouteGuard";

describe("useFlowRouteGuard helpers", () => {
  it("allows NO_PLAN on dashboard/payment and redirects other app routes to dashboard", () => {
    const state = deriveFlowState(false, false);

    expect(resolveFlowRedirectTarget("/dashboard", state)).toBeNull();
    expect(resolveFlowRedirectTarget("/dashboard/results", state)).toBe("/dashboard");
    expect(resolveFlowRedirectTarget("/interview", state)).toBe("/dashboard");
    expect(resolveFlowRedirectTarget("/payment/checkout", state)).toBeNull();
  });

  it("redirects PLAN_NO_INTERVIEW to interview except interview routes", () => {
    const state = deriveFlowState(true, false);

    expect(resolveFlowRedirectTarget("/dashboard", state)).toBe("/interview");
    expect(resolveFlowRedirectTarget("/payment", state)).toBe("/interview");
    expect(resolveFlowRedirectTarget("/interview", state)).toBeNull();
    expect(resolveFlowRedirectTarget("/dashboard/interview", state)).toBeNull();
  });

  it("redirects READY away from payment and allows app routes", () => {
    const state = deriveFlowState(true, true);

    expect(resolveFlowRedirectTarget("/payment", state)).toBe("/dashboard");
    expect(resolveFlowRedirectTarget("/dashboard", state)).toBeNull();
    expect(resolveFlowRedirectTarget("/interview", state)).toBeNull();
  });
});
