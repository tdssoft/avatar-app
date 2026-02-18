import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";
import {
  getAdminEmail,
  getEmailFrom,
  getEmailReplyTo,
} from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PostSignupRequest {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  referralCode: string;
  referredBy?: string;
  interviewData?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const adminEmail = getAdminEmail();
    const fromEmail = getEmailFrom();
    const replyTo = getEmailReplyTo();

    const body: PostSignupRequest = await req.json();
    const { userId, email, firstName, lastName, phone, referralCode, referredBy, interviewData } = body;

    console.log("[post-signup] Processing signup for user:", userId, "email:", email);
    console.log("[post-signup] referralCode:", referralCode, "referredBy:", referredBy);

    // Verify user exists
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData?.user) {
      console.error("[post-signup] User not found:", userError);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert profile (idempotent)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          first_name: firstName?.trim() || null,
          last_name: lastName?.trim() || null,
          phone: phone?.trim() || null,
          referral_code: referralCode,
          avatar_url: null,
        },
        { onConflict: "user_id", ignoreDuplicates: false }
      );

    if (profileError) {
      console.error("[post-signup] Error upserting profile:", profileError);
      // Don't fail - profile might already exist
    } else {
      console.log("[post-signup] Profile upserted successfully");
    }

    // Ensure patient row exists (admin panel list uses public.patients)
    const { error: patientError } = await supabaseAdmin
      .from("patients")
      .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: false });

    if (patientError) {
      console.error("[post-signup] Error upserting patient:", patientError);
    } else {
      console.log("[post-signup] Patient row ensured");
    }

    // Ensure main person profile exists (fallback display name for admin)
    let primaryProfileId: string | null = null;
    const { data: existingPrimaryProfile, error: existingPrimaryProfileError } = await supabaseAdmin
      .from("person_profiles")
      .select("id")
      .eq("account_user_id", userId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingPrimaryProfileError) {
      console.error("[post-signup] Error checking person profile:", existingPrimaryProfileError);
    } else if (existingPrimaryProfile?.id) {
      primaryProfileId = existingPrimaryProfile.id;
    } else {
      const profileName = `${firstName} ${lastName}`.trim() || email;
      const { data: insertedPrimaryProfile, error: insertedPrimaryProfileError } = await supabaseAdmin
        .from("person_profiles")
        .insert({
          account_user_id: userId,
          name: profileName,
          is_primary: true,
        })
        .select("id")
        .single();

      if (insertedPrimaryProfileError) {
        console.error("[post-signup] Error creating primary person profile:", insertedPrimaryProfileError);
      } else {
        primaryProfileId = insertedPrimaryProfile.id;
        console.log("[post-signup] Primary person profile created:", primaryProfileId);
      }
    }

    // Save pre-signup interview (best-effort)
    if (interviewData && primaryProfileId) {
      const { data: existingInterview, error: existingInterviewError } = await supabaseAdmin
        .from("nutrition_interviews")
        .select("id")
        .eq("person_profile_id", primaryProfileId)
        .limit(1)
        .maybeSingle();

      if (existingInterviewError) {
        console.error("[post-signup] Error checking existing interview:", existingInterviewError);
      } else if (!existingInterview) {
        const { error: interviewInsertError } = await supabaseAdmin
          .from("nutrition_interviews")
          .insert({
            person_profile_id: primaryProfileId,
            content: interviewData,
            status: "sent",
            last_updated_by: userId,
          });

        if (interviewInsertError) {
          console.error("[post-signup] Error inserting pre-signup interview:", interviewInsertError);
        } else {
          console.log("[post-signup] Pre-signup interview saved");
        }
      }
    }

    // If referred by someone, create the referral record
    if (referredBy) {
      console.log("[post-signup] Looking for referrer with code:", referredBy);

      // Find referrer by referral_code
      const { data: referrerProfile, error: referrerError } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("referral_code", referredBy)
        .maybeSingle();

      if (referrerError) {
        console.error("[post-signup] Error finding referrer:", referrerError);
      }

      if (referrerProfile) {
        console.log("[post-signup] Found referrer user_id:", referrerProfile.user_id);

        // Insert referral (with ON CONFLICT DO NOTHING for idempotency)
        const { error: referralError } = await supabaseAdmin
          .from("referrals")
          .insert({
            referrer_user_id: referrerProfile.user_id,
            referrer_code: referredBy,
            referred_user_id: userId,
            referred_email: email,
            referred_name: `${firstName} ${lastName}`,
            status: "pending",
          });

        if (referralError) {
          // Check if it's a duplicate error (unique constraint violation)
          if (referralError.code === "23505") {
            console.log("[post-signup] Referral already exists, skipping");
          } else {
            console.error("[post-signup] Error creating referral:", referralError);
          }
        } else {
          console.log("[post-signup] Referral created successfully");
        }
      } else {
        console.log("[post-signup] Referrer not found for code:", referredBy);
      }
    }

    // Send email notifications
    if (resend) {
      const fullName = `${firstName} ${lastName}`.trim() || "Nowy użytkownik";
      const registrationDate = new Date().toLocaleString("pl-PL", {
        timeZone: "Europe/Warsaw",
        dateStyle: "full",
        timeStyle: "short",
      });

      // 1. Send notification to admin about new registration
      try {
        const adminEmailResult = await resend.emails.send({
          from: fromEmail,
          to: [adminEmail],
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: `🎉 Nowa rejestracja: ${fullName}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .info-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #667eea; }
                .label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
                .value { font-size: 16px; color: #333; }
                .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0;">🎉 Nowa rejestracja!</h1>
                  <p style="margin: 10px 0 0 0; opacity: 0.9;">Ktoś właśnie dołączył do AVATAR</p>
                </div>
                <div class="content">
                  <div class="info-box">
                    <div class="label">Imię i nazwisko</div>
                    <div class="value">${fullName}</div>
                  </div>
                  <div class="info-box">
                    <div class="label">Adres email</div>
                    <div class="value">${email}</div>
                  </div>
                  <div class="info-box">
                    <div class="label">Data rejestracji</div>
                    <div class="value">${registrationDate}</div>
                  </div>
                  ${referredBy ? `
                  <div class="info-box">
                    <div class="label">Kod polecenia</div>
                    <div class="value">${referredBy}</div>
                  </div>
                  ` : ''}
                  <div class="footer">
                    <p>Ten email został wysłany automatycznie przez system AVATAR.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        console.log("[post-signup] Admin notification email sent:", adminEmailResult);
      } catch (emailError) {
        console.error("[post-signup] Error sending admin notification email:", emailError);
        // Don't fail the whole request if email fails
      }

      // 2. Send welcome email to new user
      try {
        const welcomeEmailResult = await resend.emails.send({
          from: fromEmail,
          to: [email],
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: `Witamy w AVATAR, ${firstName}! 🌟`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; border-radius: 10px 10px 0 0; text-align: center; }
                .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                .welcome-text { font-size: 18px; margin-bottom: 25px; }
                .feature { display: flex; align-items: flex-start; margin: 15px 0; background: white; padding: 15px; border-radius: 8px; }
                .feature-icon { font-size: 24px; margin-right: 15px; }
                .feature-text h3 { margin: 0 0 5px 0; font-size: 16px; }
                .feature-text p { margin: 0; color: #666; font-size: 14px; }
                .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 25px 0; }
                .footer { text-align: center; margin-top: 20px; color: #888; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1 style="margin: 0; font-size: 28px;">Witamy w AVATAR! 🌟</h1>
                  <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 16px;">Twoja droga do lepszego zdrowia zaczyna się tutaj</p>
                </div>
                <div class="content">
                  <p class="welcome-text">
                    Cześć <strong>${firstName}</strong>! 👋<br><br>
                    Dziękujemy za rejestrację w systemie AVATAR. Jesteśmy podekscytowani, że dołączasz do naszej społeczności osób dbających o swoje zdrowie!
                  </p>
                  
                  <div class="feature">
                    <div class="feature-icon">📋</div>
                    <div class="feature-text">
                      <h3>Wywiad żywieniowy</h3>
                      <p>Wypełnij szczegółowy wywiad, abyśmy mogli poznać Twoje potrzeby</p>
                    </div>
                  </div>
                  
                  <div class="feature">
                    <div class="feature-icon">🔬</div>
                    <div class="feature-text">
                      <h3>Diagnostyka</h3>
                      <p>Prześlij wyniki badań lub zamów pakiet diagnostyczny</p>
                    </div>
                  </div>
                  
                  <div class="feature">
                    <div class="feature-icon">💊</div>
                    <div class="feature-text">
                      <h3>Spersonalizowane zalecenia</h3>
                      <p>Otrzymaj indywidualne zalecenia dietetyczne i suplementacyjne</p>
                    </div>
                  </div>
                  
                  <div style="text-align: center;">
                    <a href="https://avatar-app.lovable.app/dashboard" class="cta-button">Przejdź do panelu →</a>
                  </div>
                  
                  <div class="footer">
                    <p>Masz pytania? Odpowiedz na ten email lub skontaktuj się z nami.</p>
                    <p style="margin-top: 15px;">Pozdrawiamy,<br><strong>Zespół AVATAR</strong></p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        console.log("[post-signup] Welcome email sent to user:", welcomeEmailResult);
      } catch (emailError) {
        console.error("[post-signup] Error sending welcome email:", emailError);
        // Don't fail the whole request if email fails
      }
    } else {
      console.log("[post-signup] Resend API key not configured, skipping email notifications");
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[post-signup] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
