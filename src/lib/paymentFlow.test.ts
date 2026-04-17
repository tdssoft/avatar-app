import { calcTotals } from "@/lib/paymentFlow";

describe("paymentFlow", () => {
  it("calculates mixed totals correctly", () => {
    const { oneTimeCost, monthlyCost, totalCostLabel } = calcTotals(["mini", "autopilot"]);

    expect(oneTimeCost).toBe(220);
    expect(monthlyCost).toBe(27);
    expect(totalCostLabel).toContain("220 zł teraz");
    expect(totalCostLabel).toContain("27 zł / miesiąc");
  });

  it("calculates one-time totals correctly", () => {
    const { oneTimeCost, monthlyCost, totalCostLabel } = calcTotals(["mini", "update"]);

    expect(oneTimeCost).toBe(440);
    expect(monthlyCost).toBe(0);
    expect(totalCostLabel).toBe("440 zł");
  });
});
