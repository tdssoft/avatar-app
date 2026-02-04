import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendRecommendationEmailRequest {
  recommendation_id: string;
  is_update?: boolean;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Brak autoryzacji");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Nieprawidłowy token");
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Brak uprawnień administratora");
    }

    const { recommendation_id, is_update = false }: SendRecommendationEmailRequest = await req.json();

    if (!recommendation_id) {
      throw new Error("Brak ID zalecenia");
    }

    console.log(`Processing email for recommendation ${recommendation_id}, is_update: ${is_update}`);

    // Get recommendation with patient and profile info
    const { data: recommendation, error: recError } = await supabase
      .from("recommendations")
      .select(`
        id,
        title,
        download_token,
        token_expires_at,
        recommendation_date,
        patient_id,
        person_profile_id
      `)
      .eq("id", recommendation_id)
      .single();

    if (recError || !recommendation) {
      console.error("Recommendation fetch error:", recError);
      throw new Error("Nie znaleziono zalecenia");
    }

    // Get patient to find user email
    const { data: patient, error: patientError } = await supabase
      .from("patients")
      .select("user_id")
      .eq("id", recommendation.patient_id)
      .single();

    if (patientError || !patient) {
      console.error("Patient fetch error:", patientError);
      throw new Error("Nie znaleziono pacjenta");
    }

    // Get user email from auth
    const { data: { user: patientUser }, error: authError } = await supabase.auth.admin.getUserById(patient.user_id);

    if (authError || !patientUser) {
      console.error("User fetch error:", authError);
      throw new Error("Nie znaleziono użytkownika");
    }

    // Get person profile name if exists
    let profileName = "";
    if (recommendation.person_profile_id) {
      const { data: profile } = await supabase
        .from("person_profiles")
        .select("name")
        .eq("id", recommendation.person_profile_id)
        .single();
      
      if (profile) {
        profileName = profile.name;
      }
    }

    // Generate download URL
    const appUrl = Deno.env.get("APP_URL") || "https://avatar-app.lovable.app";
    const downloadUrl = `${appUrl}/recommendation/download?token=${recommendation.download_token}`;

    // Format date
    const recDate = new Date(recommendation.recommendation_date).toLocaleDateString("pl-PL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Prepare email content based on whether it's an update or new recommendation
    const emailSubject = is_update 
      ? `Zaktualizowane zalecenie${profileName ? ` dla ${profileName}` : ""} - AVATAR`
      : `Nowe zalecenie${profileName ? ` dla ${profileName}` : ""} - AVATAR`;

    const emailTitle = is_update
      ? (profileName ? `Zaktualizowane zalecenie dla ${profileName}` : "Zaktualizowane zalecenie")
      : (profileName ? `Nowe zalecenie dla ${profileName}` : "Nowe zalecenie");

    const emailIntro = is_update
      ? `Twoje zalecenia z dnia <strong>${recDate}</strong> zostały zaktualizowane.`
      : `Przygotowaliśmy dla Ciebie nowe zalecenia z dnia <strong>${recDate}</strong>.`;

    const emailCta = is_update ? "Pobierz zaktualizowane zalecenie" : "Pobierz zalecenie";

    // Send email
    const emailResponse = await resend.emails.send({
      from: "AVATAR <noreply@eavatar.diet>",
      to: [patientUser.email!],
      subject: emailSubject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">AVATAR</h1>
                      <p style="color: #cccccc; margin: 10px 0 0 0; font-size: 14px;">Indywidualny program wsparcia ciała</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      ${is_update ? `
                        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px;">
                          <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                            📝 Twoje zalecenia zostały zaktualizowane
                          </p>
                        </div>
                      ` : ""}
                      
                      <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 22px;">
                        ${emailTitle}
                      </h2>
                      
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 15px 0;">
                        ${emailIntro}
                      </p>
                      
                      ${recommendation.title ? `
                        <p style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 20px 0 10px 0;">
                          ${recommendation.title}
                        </p>
                      ` : ""}
                      
                      <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Kliknij poniższy przycisk, aby pobrać swoje zalecenia:
                      </p>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center">
                            <a href="${downloadUrl}" style="display: inline-block; background: linear-gradient(135deg, #1a1a1a 0%, #333333 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                              ${emailCta}
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #999999; font-size: 13px; margin: 30px 0 0 0; text-align: center;">
                        Link wygasa za 7 dni. Jeśli link nie działa, skopiuj poniższy adres do przeglądarki:
                      </p>
                      <p style="color: #666666; font-size: 12px; word-break: break-all; margin: 10px 0 0 0; text-align: center;">
                        ${downloadUrl}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9f9f9; padding: 25px 30px; border-top: 1px solid #eeeeee;">
                      <p style="color: #999999; font-size: 13px; margin: 0; text-align: center;">
                        Zespół AVATAR<br>
                        <a href="https://eavatar.diet" style="color: #666666;">eavatar.diet</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: is_update ? "Email o aktualizacji wysłany pomyślnie" : "Email wysłany pomyślnie",
        email_id: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
    console.error("Error in send-recommendation-email:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
