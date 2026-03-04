export const isEmailLike = (value: string | null | undefined): boolean => {
  const normalized = (value ?? "").trim();
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
};

export const normalizeDisplayName = (value: string | null | undefined): string => {
  const normalized = (value ?? "").trim();
  if (!normalized || isEmailLike(normalized)) return "";
  return normalized;
};

export const resolvePatientDisplayName = (
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  personProfileName: string | null | undefined,
): string => {
  const profileName = normalizeDisplayName(`${firstName ?? ""} ${lastName ?? ""}`);
  if (profileName) return profileName;

  const fallbackProfileName = normalizeDisplayName(personProfileName);
  if (fallbackProfileName) return fallbackProfileName;

  return "—";
};
