import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getEmailFrom, getEmailReplyTo } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreatePatientRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const generateRandomPassword = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateReferralCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user and check admin role
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    
    if (claimsError || !claims?.claims?.sub) {
      console.error("[admin-create-patient] Claims error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminUserId = claims.claims.sub;

    // Use service role client to check admin status
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("[admin-create-patient] Not an admin:", adminUserId);
      return new Response(
        JSON.stringify({ error: "Forbidden - Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { firstName, lastName, email, phone }: CreatePatientRequest = await req.json();

    if (!firstName || !lastName || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields (firstName, lastName, email)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[admin-create-patient] Creating patient:", { email, firstName, lastName });

    // Generate a random password for the new user
    const tempPassword = generateRandomPassword();
    const referralCode = generateReferralCode();

    // Create user account using admin API
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email for admin-created accounts
      user_metadata: {
        firstName,
        lastName,
        phone,
        referralCode,
      },
    });

    if (authError) {
      console.error("[admin-create-patient] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newUserId = authData.user.id;
    console.log("[admin-create-patient] User created:", newUserId);

    // Create profile
    const { error: profileError } = await serviceClient
      .from("profiles")
      .insert({
        user_id: newUserId,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        referral_code: referralCode,
      });

    if (profileError) {
      console.error("[admin-create-patient] Profile error:", profileError);
      // Don't fail - user was created, profile might just need sync
    }

    // Create patient record
    const { error: patientError } = await serviceClient
      .from("patients")
      .insert({
        user_id: newUserId,
        subscription_status: "Brak",
        diagnosis_status: "Brak",
      });

    if (patientError) {
      console.error("[admin-create-patient] Patient error:", patientError);
      return new Response(
        JSON.stringify({ error: "Failed to create patient record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[admin-create-patient] Patient created successfully");

    // Send email with login credentials using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = getEmailFrom();
    const replyTo = getEmailReplyTo();
    let emailSent = false;
    
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        
        const emailResult = await resend.emails.send({
          from: fromEmail,
          to: [email],
          ...(replyTo ? { reply_to: replyTo } : {}),
          subject: "Twoje konto w AVATAR zostało utworzone",
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Witaj w AVATAR!</h1>
                </div>
                <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    Cześć <strong>${firstName}</strong>!
                  </p>
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    Administrator utworzył dla Ciebie konto w systemie AVATAR. Poniżej znajdziesz dane do logowania:
                  </p>
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                    <p style="margin: 0 0 12px 0; color: #333333;">
                      <strong>Email:</strong> ${email}
                    </p>
                    <p style="margin: 0; color: #333333;">
                      <strong>Hasło tymczasowe:</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${tempPassword}</code>
                    </p>
                  </div>
                  <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                    ⚠️ Zalecamy zmianę hasła po pierwszym logowaniu ze względów bezpieczeństwa.
                  </p>
                  <div style="text-align: center; margin-top: 32px;">
                    <a href="https://avatar-app.lovable.app/login" style="display: inline-block; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Zaloguj się
                    </a>
                  </div>
                </div>
                <div style="text-align: center; margin-top: 24px;">
                  <p style="color: #999999; font-size: 12px; margin: 0;">
                    © ${new Date().getFullYear()} AVATAR. Wszystkie prawa zastrzeżone.
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        });
        
        console.log("[admin-create-patient] Email sent successfully:", emailResult);
        emailSent = true;
      } catch (emailError) {
        console.error("[admin-create-patient] Email sending failed:", emailError);
        // Don't fail the whole request if email fails
      }
    } else {
      console.warn("[admin-create-patient] RESEND_API_KEY not configured, skipping email");
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId: newUserId,
        message: "Patient account created successfully",
        emailSent,
        // Return temp password for testing (in production, only rely on email)
        tempPassword: tempPassword,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[admin-create-patient] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
