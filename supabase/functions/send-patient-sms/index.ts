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
  /** "sms" = only SMS (default), "email" = only email, "both" = SMS + email */
  channel?: "sms" | "email" | "both";
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

    // Use getClaims (local JWT decode) — more reliable in edge functions than getUser()
    // which requires a network round-trip to the auth API and can fail intermittently.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      console.error("[send-patient-sms] getClaims error:", claimsError);
      return jsonResponse(401, { error: "Unauthorized" });
    }
    const callerUserId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verify admin role
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("[send-patient-sms] role check failed:", roleError);
      return jsonResponse(500, { error: "Role validation failed" });
    }
    if (!roleData) {
      return jsonResponse(403, { error: "Brak uprawnień administratora" });
    }

    const { patient_id, person_profile_id = null, message_text, channel = "sms" }: SendPatientSmsRequest = await req.json();
    const trimmedMessage = (message_text || "").trim();

    if (!patient_id || !trimmedMessage) {
      return jsonResponse(400, { error: "Brak wymaganych pól: patient_id, message_text" });
    }

    if (trimmedMessage.length > 1000) {
      return jsonResponse(400, { error: "Wiadomość SMS jest za długa (max 1000 znaków)" });
    }

    // Get patient user_id
    const { data: patient, error: patientError } = await adminClient
      .from("patients")
      .select("user_id")
      .eq("id", patient_id)
      .single();

    if (patientError || !patient) {
      return jsonResponse(404, { error: "Nie znaleziono pacjenta" });
    }

    // Get phone number + email
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("phone")
      .eq("user_id", patient.user_id)
      .maybeSingle();

    if (profileError) {
      return jsonResponse(500, { error: "Nie udało się pobrać profilu pacjenta" });
    }

    // Get patient email from auth.users
    const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(patient.user_id);
    const patientEmail = authUserData?.user?.email ?? null;

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      return jsonResponse(500, { error: "Brak konfiguracji BREVO_API_KEY" });
    }

    let smsSent = false;
    let emailSent = false;
    let smsMessageId: string | null = null;

    const wantSms = channel === "sms" || channel === "both";
    const wantEmail = channel === "email" || channel === "both";

    // --- Attempt SMS if requested and phone number available ---
    const rawPhone = profile?.phone?.trim() ?? "";
    const toNumber = rawPhone ? normalizeToE164(rawPhone) : null;

    if (wantSms && toNumber) {
      const brevoResponse = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          sender: "AVATAR",
          recipient: toNumber,
          content: trimmedMessage,
          type: "transactional",
        }),
      });

      const brevoData = await brevoResponse.json().catch(() => ({}));

      if (brevoResponse.ok) {
        smsSent = true;
        smsMessageId = brevoData?.messageId ?? null;
        console.log(`[send-patient-sms] SMS sent to ${toNumber}, messageId: ${smsMessageId}`);
      } else {
        console.error("[send-patient-sms] Brevo SMS error:", brevoData);
      }
    } else if (wantSms) {
      console.warn("[send-patient-sms] No valid phone number for patient, skipping SMS");
    }

    // --- Send email if requested ---
    if (wantEmail && patientEmail) {
      try {
        const emailPayload = {
          sender: { name: "AVATAR", email: "noreply@eavatar.diet" },
          to: [{ email: patientEmail }],
          subject: "Masz nową wiadomość od dietetyka AVATAR",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">💬 Wiadomość od dietetyka</h1>
              </div>
              <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
                <p style="color: #374151; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${trimmedMessage}</p>
                <div style="margin-top: 30px; text-align: center;">
                  <a href="https://app.eavatar.diet/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;">
                    Otwórz platformę →
                  </a>
                </div>
              </div>
              <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 16px;">
                © ${new Date().getFullYear()} AVATAR — System Zarządzania Zdrowiem
              </p>
            </div>
          `,
        };

        const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
          body: JSON.stringify(emailPayload),
        });

        if (emailRes.ok) {
          emailSent = true;
          console.log(`[send-patient-sms] Email notification sent to ${patientEmail}`);
        } else {
          const emailErr = await emailRes.text();
          console.error("[send-patient-sms] Email send error:", emailErr);
        }
      } catch (emailError) {
        console.error("[send-patient-sms] Email send exception:", emailError);
      }
    }

    // Fail if no channel worked
    if (!smsSent && !emailSent) {
      if (wantSms && !toNumber) {
        return jsonResponse(400, { error: "Pacjent nie ma ustawionego numeru telefonu" });
      }
      if (wantEmail && !patientEmail) {
        return jsonResponse(400, { error: "Nie można znaleźć adresu email pacjenta" });
      }
      return jsonResponse(502, { error: "Nie udało się wysłać wiadomości" });
    }

    // Save to patient_messages history
    // channel="email" means admin reply to a form question → use "answer" so it
    // appears in "Zadane pytania przez formularz" section, not in "Komunikacja SMS".
    const savedMessageType = channel === "email" ? "answer" : "sms";
    const { error: insertError } = await adminClient.from("patient_messages").insert({
      patient_id,
      admin_id: callerUserId,
      message_type: savedMessageType,
      message_text: trimmedMessage,
      person_profile_id,
    });

    if (insertError) {
      console.error("[send-patient-sms] insert message error:", insertError);
    }

    return jsonResponse(200, {
      success: true,
      message: smsSent && emailSent
        ? "Wysłano SMS i email do pacjenta"
        : smsSent
        ? "Wysłano SMS do pacjenta"
        : "Wysłano email do pacjenta (brak numeru telefonu)",
      smsSent,
      emailSent,
      messageId: smsMessageId,
      to: toNumber,
    });

  } catch (error) {
    console.error("[send-patient-sms] unexpected error:", error);
    return jsonResponse(500, { error: "Internal server error" });
  }
});
