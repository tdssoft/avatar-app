import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface VerifyTokenRequest {
  token: string;
  access_type?: "view" | "download";
  ip_address?: string;
  user_agent?: string;
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

    const { token, access_type = "view", ip_address, user_agent }: VerifyTokenRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Brak tokenu", valid: false }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Find recommendation by token
    const { data: recommendation, error: recError } = await supabase
      .from("recommendations")
      .select(`
        id,
        title,
        content,
        tags,
        download_token,
        token_expires_at,
        recommendation_date,
        body_systems,
        diagnosis_summary,
        dietary_recommendations,
        supplementation_program,
        shop_links,
        supporting_therapies,
        pdf_url,
        person_profile_id,
        patient_id
      `)
      .eq("download_token", token)
      .single();

    if (recError || !recommendation) {
      console.error("Token verification error:", recError);
      return new Response(
        JSON.stringify({ 
          error: "Nieprawidłowy lub nieistniejący token", 
          valid: false 
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if token is expired
    if (recommendation.token_expires_at) {
      const expiresAt = new Date(recommendation.token_expires_at);
      if (expiresAt < new Date()) {
        return new Response(
          JSON.stringify({ 
            error: "Token wygasł. Poproś o nowy link.", 
            valid: false,
            expired: true 
          }),
          {
            status: 410,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
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

    // Log access
    const { error: logError } = await supabase
      .from("recommendation_access_log")
      .insert({
        recommendation_id: recommendation.id,
        person_profile_id: recommendation.person_profile_id,
        access_type,
        ip_address: ip_address || null,
        user_agent: user_agent || null,
      });

    if (logError) {
      console.error("Access log error:", logError);
      // Don't fail the request if logging fails
    }

    // Prepare response data
    const responseData = {
      valid: true,
      recommendation: {
        id: recommendation.id,
        title: recommendation.title,
        content: recommendation.content,
        tags: recommendation.tags,
        recommendation_date: recommendation.recommendation_date,
        body_systems: recommendation.body_systems,
        diagnosis_summary: recommendation.diagnosis_summary,
        dietary_recommendations: recommendation.dietary_recommendations,
        supplementation_program: recommendation.supplementation_program,
        shop_links: recommendation.shop_links,
        supporting_therapies: recommendation.supporting_therapies,
        pdf_url: recommendation.pdf_url,
        profile_name: profileName,
      },
    };

    console.log("Token verified successfully for recommendation:", recommendation.id);

    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
    console.error("Error in verify-download-token:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage, valid: false }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
