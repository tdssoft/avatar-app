export interface RecommendationProfileOption {
  id: string;
}

export function resolveRecommendationProfileId(
  profiles: RecommendationProfileOption[],
  requestedProfileId: string | null | undefined,
): string {
  const normalizedRequested = requestedProfileId?.trim() || "";
  if (normalizedRequested && profiles.some((profile) => profile.id === normalizedRequested)) {
    return normalizedRequested;
  }

  return profiles[0]?.id ?? "";
}
