import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getAdminEmail,
  getEmailFrom,
  getEmailReplyTo,
} from "../_shared/email-config.ts";
import { sendBrevoEmail } from "../_shared/brevo-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuestionNotificationRequest {
  type: "patient_question" | "support_ticket" | "interview_sent" | "interview_draft";
  user_email: string;
  user_name: string;
  subject?: string;
  message: string;
  profile_name?: string;
  patient_id?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify user token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    
    if (userError || !user) {
      console.error("[send-question-notification] User error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { type, user_email, user_name, subject, message, profile_name, patient_id }: QuestionNotificationRequest = await req.json();

    if (!type) {
      return new Response(
        JSON.stringify({ error: "Missing required field: type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[send-question-notification] Sending notification:", { type, user_email, user_name });

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      console.error("[send-question-notification] BREVO_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminEmail = getAdminEmail();
    const fromEmail = getEmailFrom();
    const replyTo = getEmailReplyTo();

    // Generate email content based on type
    let emailSubject: string;
    let emailHtml: string;

    if (type === "interview_sent") {
      const adminPanelUrl = patient_id
        ? `https://app.eavatar.diet/admin/patient/${patient_id}?tab=interview`
        : "https://app.eavatar.diet/admin";
      emailSubject = `📋 Nowy wywiad od ${profile_name || user_name || user_email}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">📋 Pacjent wysłał wywiad dietetyczny</h1>
            </div>
            <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="border-left: 4px solid #0ea5e9; padding-left: 16px; margin-bottom: 24px;">
                <p style="color: #666666; font-size: 14px; margin: 0 0 4px 0;">Pacjent:</p>
                <p style="color: #333333; font-size: 18px; font-weight: 700; margin: 0;">
                  ${profile_name || user_name || "Nieznany"}
                </p>
                <p style="color: #888888; font-size: 14px; margin: 4px 0 0 0;">${user_email || ""}</p>
              </div>
              <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="color: #0284c7; font-size: 14px; font-weight: 600; margin: 0;">
                  ✅ Wywiad dietetyczny został wypełniony i wysłany przez pacjenta.
                  Możesz teraz przejrzeć odpowiedzi i przygotować zalecenia.
                </p>
              </div>
              <div style="text-align: center; margin-top: 32px;">
                <a href="${adminPanelUrl}" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Zobacz wywiad w panelu →
                </a>
              </div>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                Wiadomość wysłana automatycznie przez system AVATAR
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "interview_draft") {
      const adminPanelUrl = patient_id
        ? `https://app.eavatar.diet/admin/patient/${patient_id}?tab=interview`
        : "https://app.eavatar.diet/admin";
      emailSubject = `✏️ Pacjent edytował wywiad – ${profile_name || user_name || user_email}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">✏️ Pacjent edytował wywiad dietetyczny</h1>
            </div>
            <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="border-left: 4px solid #f59e0b; padding-left: 16px; margin-bottom: 24px;">
                <p style="color: #666666; font-size: 14px; margin: 0 0 4px 0;">Pacjent:</p>
                <p style="color: #333333; font-size: 18px; font-weight: 700; margin: 0;">
                  ${profile_name || user_name || "Nieznany"}
                </p>
                <p style="color: #888888; font-size: 14px; margin: 4px 0 0 0;">${user_email || ""}</p>
              </div>
              <div style="background-color: #fffbeb; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="color: #b45309; font-size: 14px; font-weight: 600; margin: 0;">
                  💾 Wywiad został zapisany jako wersja robocza. Pacjent nie ukończył jeszcze wywiadu.
                </p>
              </div>
              <div style="text-align: center; margin-top: 32px;">
                <a href="${adminPanelUrl}" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Zobacz wywiad w panelu →
                </a>
              </div>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                Wiadomość wysłana automatycznie przez system AVATAR
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "patient_question") {
      emailSubject = `📩 Nowe pytanie od ${user_name || user_email}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">📩 Nowe pytanie od pacjenta</h1>
            </div>
            <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="border-left: 4px solid #2563eb; padding-left: 16px; margin-bottom: 24px;">
                <p style="color: #666666; font-size: 14px; margin: 0 0 4px 0;">Od:</p>
                <p style="color: #333333; font-size: 16px; font-weight: 600; margin: 0;">
                  ${user_name || "Nieznany użytkownik"} (${user_email || "brak emaila"})
                </p>
                ${profile_name ? `<p style="color: #666666; font-size: 14px; margin: 8px 0 0 0;">Profil: ${profile_name}</p>` : ''}
              </div>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="color: #666666; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Treść pytania:</p>
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              <div style="text-align: center; margin-top: 32px;">
                <a href="https://app.eavatar.diet/admin" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Odpowiedz w panelu admina
                </a>
              </div>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                Wiadomość wysłana automatycznie przez system AVATAR
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      // support_ticket
      emailSubject = `📩 Nowe zgłoszenie: ${subject || "Bez tematu"}`;
      emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">📩 Nowe zgłoszenie wsparcia</h1>
            </div>
            <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="border-left: 4px solid #059669; padding-left: 16px; margin-bottom: 24px;">
                <p style="color: #666666; font-size: 14px; margin: 0 0 4px 0;">Od:</p>
                <p style="color: #333333; font-size: 16px; font-weight: 600; margin: 0;">
                  ${user_name || "Nieznany użytkownik"} (${user_email || "brak emaila"})
                </p>
                ${profile_name ? `<p style="color: #666666; font-size: 14px; margin: 8px 0 0 0;">Profil: ${profile_name}</p>` : ''}
              </div>
              <div style="margin-bottom: 16px;">
                <p style="color: #666666; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Temat:</p>
                <p style="color: #333333; font-size: 18px; font-weight: 600; margin: 0;">${subject || "Bez tematu"}</p>
              </div>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="color: #666666; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Treść wiadomości:</p>
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              <div style="text-align: center; margin-top: 32px;">
                <a href="https://app.eavatar.diet/admin" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Obsłuż zgłoszenie
                </a>
              </div>
            </div>
            <div style="text-align: center; margin-top: 24px;">
              <p style="color: #999999; font-size: 12px; margin: 0;">
                Wiadomość wysłana automatycznie przez system AVATAR
              </p>
            </div>
          </div>
        </body>
        </html>
      `;
    }

    // Send email to admin via Brevo (shared helper — handles "Name <email>" format)
    await sendBrevoEmail({
      apiKey: brevoApiKey,
      from: fromEmail,
      to: adminEmail,
      ...(replyTo ? { replyTo } : {}),
      subject: emailSubject,
      html: emailHtml,
    });
    console.log("[send-question-notification] Email sent successfully via Brevo to:", adminEmail);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Notification sent successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[send-question-notification] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
