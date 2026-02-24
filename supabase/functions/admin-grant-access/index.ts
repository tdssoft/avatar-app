import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRANT_REASONS = new Set(["platnosc_gotowka", "inny_przypadek"]);
const PRODUCTS: Record<string, { name: string }> = {
  optimal: { name: "Pełny Program Startowy" },
  mini: { name: "Mini Program Startowy" },
  update: { name: "Kontynuacja Programu Zdrowotnego" },
  menu: { name: "Jadłospis 7-dniowy" },
  autopilot: { name: "Autopilot Zdrowia - program stałego wsparcia" },
};

interface GrantAccessRequest {
  patientId: string;
  reason: "platnosc_gotowka" | "inny_przypadek";
  productId: string;
}

const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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

    const { patientId, reason, productId }: GrantAccessRequest = await req.json();

    if (!patientId || !isUuid(patientId)) {
      return new Response(JSON.stringify({ error: "Invalid patientId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!reason || !GRANT_REASONS.has(reason)) {
      return new Response(JSON.stringify({ error: "Invalid reason" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const product = PRODUCTS[productId];
    if (!product) {
      return new Response(JSON.stringify({ error: "Invalid productId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: patient, error: patientError } = await serviceClient
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .maybeSingle();

    if (patientError || !patient) {
      return new Response(JSON.stringify({ error: "Patient not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await serviceClient
      .from("patients")
      .update({ subscription_status: "Aktywna" })
      .eq("id", patientId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update patient subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: grantData, error: grantError } = await serviceClient
      .from("admin_access_grants")
      .insert({
        patient_id: patientId,
        granted_by_user_id: adminUserId,
        reason,
        product_id: productId,
        product_name: product.name,
      })
      .select("id")
      .single();

    if (grantError) {
      return new Response(JSON.stringify({ error: "Failed to create access grant audit" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        grantId: grantData.id,
        patientId,
        reason,
        productId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[admin-grant-access] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
