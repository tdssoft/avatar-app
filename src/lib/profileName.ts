export const splitProfileName = (value: string | null | undefined) => {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
};

export const buildProfileName = (firstName: string, lastName: string) =>
  [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
