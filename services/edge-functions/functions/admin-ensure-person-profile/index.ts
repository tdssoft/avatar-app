import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EnsurePersonProfileRequest {
  patientId?: string;
  accountUserId?: string;
}

const isEmailLike = (value: string | null | undefined): boolean => {
  const normalized = (value ?? "").trim();
  if (!normalized) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
};

const buildProfileName = (firstName: string | null | undefined, lastName: string | null | undefined) => {
  const fullName = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return fullName || "—";
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminUserId = claims.claims.sub;

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: EnsurePersonProfileRequest = await req.json();
    let accountUserId = (body.accountUserId ?? "").trim();

    if (!accountUserId && body.patientId) {
      const { data: patient, error: patientError } = await serviceClient
        .from("patients")
        .select("user_id")
        .eq("id", body.patientId)
        .maybeSingle();
      if (patientError || !patient?.user_id) {
        return new Response(JSON.stringify({ error: "Nie znaleziono pacjenta" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accountUserId = patient.user_id;
    }

    if (!accountUserId) {
      return new Response(JSON.stringify({ error: "Brak accountUserId lub patientId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profileRow, error: profileError } = await serviceClient
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", accountUserId)
      .maybeSingle();
    if (profileError) {
      console.error("[admin-ensure-person-profile] profile read error:", profileError);
    }
    const targetName = buildProfileName(profileRow?.first_name, profileRow?.last_name);

    const { data: primary, error: primaryError } = await serviceClient
      .from("person_profiles")
      .select("id, name")
      .eq("account_user_id", accountUserId)
      .eq("is_primary", true)
      .maybeSingle();
    if (primaryError) {
      console.error("[admin-ensure-person-profile] primary read error:", primaryError);
    }

    if (!primary) {
      const { data: inserted, error: insertError } = await serviceClient
        .from("person_profiles")
        .insert({ account_user_id: accountUserId, name: targetName, is_primary: true })
        .select("id, name")
        .single();
      if (insertError || !inserted) {
        console.error("[admin-ensure-person-profile] insert error:", insertError);
        return new Response(JSON.stringify({ error: "Nie udało się utworzyć profilu głównego" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, person_profile_id: inserted.id, name: inserted.name }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentName = (primary.name ?? "").trim();
    if (!currentName || isEmailLike(currentName)) {
      const { data: updated, error: updateError } = await serviceClient
        .from("person_profiles")
        .update({ name: targetName, updated_at: new Date().toISOString() })
        .eq("id", primary.id)
        .select("id, name")
        .single();
      if (updateError || !updated) {
        console.error("[admin-ensure-person-profile] update error:", updateError);
        return new Response(JSON.stringify({ error: "Nie udało się zaktualizować profilu głównego" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, person_profile_id: updated.id, name: updated.name }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, person_profile_id: primary.id, name: primary.name }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[admin-ensure-person-profile] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

