import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RepairReferralRequest {
  referredEmail: string;
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

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Brak autoryzacji" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the caller's user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: "Nieprawidłowy token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[repair-referral] Caller:", caller.id, caller.email);

    // Get caller's profile to verify they have a referral code
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("referral_code")
      .eq("user_id", caller.id)
      .single();

    if (profileError || !callerProfile?.referral_code) {
      return new Response(
        JSON.stringify({ error: "Nie masz kodu polecającego" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerReferralCode = callerProfile.referral_code;
    console.log("[repair-referral] Caller referral code:", callerReferralCode);

    const body: RepairReferralRequest = await req.json();
    const { referredEmail } = body;

    if (!referredEmail) {
      return new Response(
        JSON.stringify({ error: "Podaj email poleconej osoby" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[repair-referral] Looking for user with email:", referredEmail);

    // Find the referred user by email
    const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) {
      console.error("[repair-referral] Error listing users:", usersError);
      return new Response(
        JSON.stringify({ error: "Błąd wyszukiwania użytkownika" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const referredUser = usersData.users.find(u => u.email?.toLowerCase() === referredEmail.toLowerCase());
    if (!referredUser) {
      return new Response(
        JSON.stringify({ error: "Nie znaleziono użytkownika o podanym emailu" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[repair-referral] Found referred user:", referredUser.id);

    // Check if the referred user's metadata has referredBy matching caller's code
    const referredBy = referredUser.user_metadata?.referredBy;
    if (referredBy !== callerReferralCode) {
      console.log("[repair-referral] referredBy mismatch:", referredBy, "vs", callerReferralCode);
      return new Response(
        JSON.stringify({ error: "Ta osoba nie zarejestrowała się z Twojego linku polecającego" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if referral already exists
    const { data: existingReferral } = await supabaseAdmin
      .from("referrals")
      .select("id")
      .eq("referred_user_id", referredUser.id)
      .maybeSingle();

    if (existingReferral) {
      return new Response(
        JSON.stringify({ error: "Polecenie dla tej osoby już istnieje" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the referral
    const firstName = referredUser.user_metadata?.firstName || "";
    const lastName = referredUser.user_metadata?.lastName || "";

    const { error: referralError } = await supabaseAdmin
      .from("referrals")
      .insert({
        referrer_user_id: caller.id,
        referrer_code: callerReferralCode,
        referred_user_id: referredUser.id,
        referred_email: referredUser.email || referredEmail,
        referred_name: `${firstName} ${lastName}`.trim() || "Użytkownik",
        status: "pending",
      });

    if (referralError) {
      console.error("[repair-referral] Error creating referral:", referralError);
      return new Response(
        JSON.stringify({ error: "Nie udało się utworzyć polecenia" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[repair-referral] Referral created successfully");

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[repair-referral] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
