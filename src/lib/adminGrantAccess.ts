import { supabase } from "@/integrations/supabase/client";

type GrantAccessErrorLike = {
  message?: string;
  context?: {
    json?: () => Promise<unknown>;
  };
};

interface GrantAccessErrorPayload {
  error?: string;
}

export interface GrantAccessRequest {
  patientId: string;
  personProfileId: string;
  reason: string;
  productId: string;
}

export interface GrantAccessResponse {
  success: boolean;
  patientId: string;
  personProfileId?: string;
  grantedProfileIds: string[];
  grantedProfilesCount: number;
  productId: string;
  reason: string;
}

const ADMIN_GRANT_ACCESS_OVERRIDE_URL = import.meta.env.VITE_ADMIN_GRANT_ACCESS_URL?.trim();

export async function invokeAdminGrantAccess(payload: GrantAccessRequest): Promise<{
  data: GrantAccessResponse | null;
  error: GrantAccessErrorLike | null;
}> {
  if (!ADMIN_GRANT_ACCESS_OVERRIDE_URL) {
    const { data, error } = await supabase.functions.invoke<GrantAccessResponse>("admin-grant-access", {
      body: payload,
    });
    return { data, error };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return {
      data: null,
      error: {
        message: "Brak aktywnej sesji administratora",
      },
    };
  }

  const response = await fetch(ADMIN_GRANT_ACCESS_OVERRIDE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return {
      data: null,
      error: {
        message: `Grant access failed with status ${response.status}`,
        context: {
          json: async () => response.json().catch(() => null),
        },
      },
    };
  }

  return {
    data: (await response.json()) as GrantAccessResponse,
    error: null,
  };
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

export function formatGrantAccessSuccessMessage(
  grantedProfilesCount: number,
  profileName?: string | null,
): string {
  const normalizedProfileName = profileName?.trim();
  if (normalizedProfileName) {
    return `Dostęp został przyznany dla profilu: ${normalizedProfileName}`;
  }

  if (grantedProfilesCount === 1) {
    return "Dostęp został przyznany dla wybranego profilu";
  }

  return `Dostęp został przyznany dla ${grantedProfilesCount} profili`;
}
