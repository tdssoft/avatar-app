import { describe, expect, it } from "vitest";

import { resolveRecommendationProfileId } from "@/lib/recommendationProfile";

describe("resolveRecommendationProfileId", () => {
  const profiles = [
    { id: "primary-profile" },
    { id: "child-profile" },
  ];

  it("uses requested profile when it belongs to the patient account", () => {
    expect(resolveRecommendationProfileId(profiles, "child-profile")).toBe("child-profile");
  });

  it("falls back to the first profile when requested profile is missing", () => {
    expect(resolveRecommendationProfileId(profiles, "missing-profile")).toBe("primary-profile");
  });

  it("returns empty string when no profiles exist", () => {
    expect(resolveRecommendationProfileId([], "child-profile")).toBe("");
  });
});
