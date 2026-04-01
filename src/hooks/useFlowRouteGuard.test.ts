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

  it("keeps PLAN_NO_INTERVIEW on /dashboard and redirects payment to interview", () => {
    const state = deriveFlowState(true, false);

    expect(resolveFlowRedirectTarget("/dashboard", state)).toBeNull();
    expect(resolveFlowRedirectTarget("/payment", state)).toBe("/interview");
    expect(resolveFlowRedirectTarget("/interview", state)).toBeNull();
    expect(resolveFlowRedirectTarget("/dashboard/interview", state)).toBeNull();
  });

  it("allows READY on payment (upgrade) and other app routes", () => {
    const state = deriveFlowState(true, true);

    // READY users can access /payment to purchase an upgrade package (e.g. "optimal" 370 zł)
    expect(resolveFlowRedirectTarget("/payment", state)).toBeNull();
    expect(resolveFlowRedirectTarget("/payment/method", state)).toBeNull();
    expect(resolveFlowRedirectTarget("/dashboard", state)).toBeNull();
    expect(resolveFlowRedirectTarget("/interview", state)).toBeNull();
  });
});
