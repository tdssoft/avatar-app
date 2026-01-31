import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
  referralCode: string;
  referredBy?: string;
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

    const body: PostSignupRequest = await req.json();
    const { userId, email, firstName, lastName, referralCode, referredBy } = body;

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

    // Upsert profile (idempotent - ON CONFLICT DO NOTHING for unique user_id)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          user_id: userId,
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
