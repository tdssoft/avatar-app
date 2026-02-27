import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendPatientSmsRequest {
  patient_id: string;
  person_profile_id?: string | null;
  message_text: string;
}

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeToE164 = (rawPhone: string): string | null => {
  const withoutFormatting = rawPhone.replace(/[\s\-().]/g, "");

  let normalized = withoutFormatting;
  if (normalized.startsWith("00")) {
    normalized = `+${normalized.slice(2)}`;
  } else if (!normalized.startsWith("+")) {
    if (/^\d{9}$/.test(normalized)) {
      normalized = `+48${normalized}`;
    } else if (/^\d{10,15}$/.test(normalized)) {
      normalized = `+${normalized}`;
    }
  }

  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return jsonResponse(500, { error: "Supabase environment is not configured" });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(401, { error: "Unauthorized" });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("[send-patient-sms] role check failed:", roleError);
      return jsonResponse(500, { error: "Role validation failed" });
    }

    if (!roleData) {
      return jsonResponse(403, { error: "Brak uprawnień administratora" });
    }

    const { patient_id, person_profile_id = null, message_text }: SendPatientSmsRequest = await req.json();
    const trimmedMessage = (message_text || "").trim();

    if (!patient_id || !trimmedMessage) {
      return jsonResponse(400, { error: "Brak wymaganych pól: patient_id, message_text" });
    }

    if (trimmedMessage.length > 1000) {
      return jsonResponse(400, { error: "Wiadomość SMS jest za długa (max 1000 znaków)" });
    }

    const { data: patient, error: patientError } = await adminClient
      .from("patients")
      .select("user_id")
      .eq("id", patient_id)
      .single();

    if (patientError || !patient) {
      console.error("[send-patient-sms] patient fetch error:", patientError);
      return jsonResponse(404, { error: "Nie znaleziono pacjenta" });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("phone")
      .eq("user_id", patient.user_id)
      .maybeSingle();

    if (profileError) {
      console.error("[send-patient-sms] profile fetch error:", profileError);
      return jsonResponse(500, { error: "Nie udało się pobrać numeru telefonu pacjenta" });
    }

    if (!profile?.phone?.trim()) {
      return jsonResponse(400, { error: "Pacjent nie ma ustawionego numeru telefonu" });
    }

    const toNumber = normalizeToE164(profile.phone);
    if (!toNumber) {
      return jsonResponse(400, { error: "Nieprawidłowy numer telefonu pacjenta (wymagany format E.164)" });
    }

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");
    const twilioMessagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

    if (!twilioAccountSid || !twilioAuthToken) {
      return jsonResponse(500, { error: "Brak konfiguracji Twilio (SID/TOKEN)" });
    }

    if (!twilioFromNumber && !twilioMessagingServiceSid) {
      return jsonResponse(500, {
        error: "Brak konfiguracji Twilio nadawcy (TWILIO_FROM_NUMBER lub TWILIO_MESSAGING_SERVICE_SID)",
      });
    }

    const twilioPayload = new URLSearchParams({
      To: toNumber,
      Body: trimmedMessage,
    });

    if (twilioMessagingServiceSid) {
      twilioPayload.append("MessagingServiceSid", twilioMessagingServiceSid);
    } else if (twilioFromNumber) {
      twilioPayload.append("From", twilioFromNumber);
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${twilioAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twilioPayload.toString(),
    });

    const twilioData = await twilioResponse.json().catch(() => ({}));

    if (!twilioResponse.ok) {
      const twilioError = typeof twilioData?.message === "string" ? twilioData.message : "Twilio request failed";
      console.error("[send-patient-sms] Twilio error:", twilioData);
      return jsonResponse(502, { error: `Nie udało się wysłać SMS: ${twilioError}` });
    }

    const { error: insertError } = await adminClient.from("patient_messages").insert({
      patient_id,
      admin_id: user.id,
      message_type: "sms",
      message_text: trimmedMessage,
      person_profile_id,
    });

    if (insertError) {
      console.error("[send-patient-sms] insert message error:", insertError);
      return jsonResponse(500, { error: "SMS wysłany, ale nie udało się zapisać historii wiadomości" });
    }

    return jsonResponse(200, {
      success: true,
      message: "SMS sent successfully",
      twilio_sid: twilioData?.sid ?? null,
    });
  } catch (error) {
    console.error("[send-patient-sms] unexpected error:", error);
    return jsonResponse(500, { error: "Internal server error" });
  }
});
