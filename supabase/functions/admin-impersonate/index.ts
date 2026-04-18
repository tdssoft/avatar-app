import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

    // Verify admin role using user_roles table
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

    const { target_user_id } = await req.json();

    if (!target_user_id) {
      return new Response(JSON.stringify({ error: "Missing target_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get target user email via Auth Admin REST API (supabase-js@2 w tej wersji Deno nie ma auth.admin)
    const getUserRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${target_user_id}`, {
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
      },
    });

    if (!getUserRes.ok) {
      const errBody = await getUserRes.text();
      console.error("[admin-impersonate] getUser failed:", errBody);
      return new Response(JSON.stringify({ error: "Target user not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUser = await getUserRes.json();
    const targetEmail = targetUser.email;

    if (!targetEmail) {
      return new Response(JSON.stringify({ error: "Target user has no email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate magic link via Auth Admin REST API
    const generateLinkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseServiceKey}`,
        apikey: supabaseServiceKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "magiclink",
        email: targetEmail,
        redirect_to: `${supabaseUrl}/dashboard`,
      }),
    });

    if (!generateLinkRes.ok) {
      const errBody = await generateLinkRes.text();
      console.error("[admin-impersonate] generateLink failed:", errBody);
      return new Response(JSON.stringify({ error: "Failed to generate magic link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const linkData = await generateLinkRes.json();
    const actionLink = linkData.action_link ?? linkData.properties?.action_link;

    if (!actionLink) {
      console.error("[admin-impersonate] No action_link in response:", JSON.stringify(linkData));
      return new Response(JSON.stringify({ error: "No action link returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Follow the magic link redirect to get session tokens directly
    // This avoids localStorage session conflicts in the browser
    const verifyRes = await fetch(actionLink, { redirect: "manual" });
    const location = verifyRes.headers.get("location") ?? "";
    console.log("[admin-impersonate] verify redirect location prefix:", location.substring(0, 80));

    // Parse access_token + refresh_token from the redirect hash
    let access_token: string | null = null;
    let refresh_token: string | null = null;

    if (location) {
      const hashIndex = location.indexOf("#");
      if (hashIndex !== -1) {
        const params = new URLSearchParams(location.substring(hashIndex + 1));
        access_token = params.get("access_token");
        refresh_token = params.get("refresh_token");
      }
    }

    if (!access_token || !refresh_token) {
      // Fallback: return magic link URL for browser to handle
      console.log("[admin-impersonate] Could not extract tokens, falling back to magic link URL");
      return new Response(
        JSON.stringify({ url: actionLink, user_id: target_user_id, email: targetEmail }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token,
        refresh_token,
        user_id: target_user_id,
        email: targetEmail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[admin-impersonate] Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
