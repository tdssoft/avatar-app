type GrantAccessErrorLike = {
  message?: string;
  context?: {
    json?: () => Promise<unknown>;
  };
};

interface GrantAccessErrorPayload {
  error?: string;
}

export interface GrantAccessResponse {
  success: boolean;
  patientId: string;
  grantedProfileIds: string[];
  grantedProfilesCount: number;
  productId: string;
  reason: string;
}

export async function resolveGrantAccessErrorMessage(
  error: unknown,
  fallback = "Nie udało się przyznać dostępu",
): Promise<string> {
  const maybeError = error as GrantAccessErrorLike | undefined;
  const json = await maybeError?.context?.json?.().catch(() => null);
  const payload = (json ?? null) as GrantAccessErrorPayload | null;

  if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
    return payload.error;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

export function formatGrantAccessSuccessMessage(grantedProfilesCount: number): string {
  if (grantedProfilesCount === 1) {
    return "Dostęp został przyznany dla 1 profilu";
  }

  return `Dostęp został przyznany dla ${grantedProfilesCount} profili`;
}
