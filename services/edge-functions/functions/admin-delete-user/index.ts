import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DeleteUserRequest {
  patient_id: string;
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

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Brak autoryzacji" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: callerError } = await supabaseAdmin.auth.getUser(token);
    
    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Nieprawidłowy token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      console.error("[admin-delete-user] User is not admin:", callerUser.id);
      return new Response(
        JSON.stringify({ error: "Brak uprawnień administratora" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: DeleteUserRequest = await req.json();
    const { patient_id } = body;

    if (!patient_id) {
      return new Response(
        JSON.stringify({ error: "Brak ID pacjenta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[admin-delete-user] Deleting patient:", patient_id);

    // Get the patient to find their user_id
    const { data: patient, error: patientError } = await supabaseAdmin
      .from("patients")
      .select("user_id")
      .eq("id", patient_id)
      .single();

    if (patientError || !patient) {
      console.error("[admin-delete-user] Patient not found:", patientError);
      return new Response(
        JSON.stringify({ error: "Nie znaleziono pacjenta" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = patient.user_id;
    console.log("[admin-delete-user] Found user_id:", userId);

    // Prevent admin from deleting themselves
    if (userId === callerUser.id) {
      return new Response(
        JSON.stringify({ error: "Nie możesz usunąć własnego konta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete related data first (in case CASCADE doesn't cover everything)
    // Most should be handled by CASCADE, but let's be explicit
    
    // 1. Delete audio recordings files from storage
    const { data: audioRecordings } = await supabaseAdmin
      .from("audio_recordings")
      .select("file_path, person_profile_id")
      .eq("recorded_by", userId);

    if (audioRecordings && audioRecordings.length > 0) {
      const filePaths = audioRecordings.map(r => r.file_path);
      const { error: storageError } = await supabaseAdmin.storage
        .from("audio-recordings")
        .remove(filePaths);
      
      if (storageError) {
        console.error("[admin-delete-user] Error deleting audio files:", storageError);
      }
    }

    // 2. Delete user results files from storage
    const { data: userResults } = await supabaseAdmin
      .from("user_results")
      .select("file_path")
      .eq("user_id", userId);

    if (userResults && userResults.length > 0) {
      const filePaths = userResults.map(r => r.file_path);
      const { error: storageError } = await supabaseAdmin.storage
        .from("results")
        .remove(filePaths);
      
      if (storageError) {
        console.error("[admin-delete-user] Error deleting result files:", storageError);
      }
    }

    // 3. Delete avatar from storage
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("user_id", userId)
      .single();

    if (profile?.avatar_url) {
      // Extract path from URL
      const avatarPath = profile.avatar_url.split("/avatars/")[1];
      if (avatarPath) {
        await supabaseAdmin.storage.from("avatars").remove([avatarPath]);
      }
    }

    // 4. Delete person_profiles (this should cascade to related records)
    const { error: personProfilesError } = await supabaseAdmin
      .from("person_profiles")
      .delete()
      .eq("account_user_id", userId);

    if (personProfilesError) {
      console.error("[admin-delete-user] Error deleting person_profiles:", personProfilesError);
    }

    // 5. Delete patient record
    const { error: deletePatientError } = await supabaseAdmin
      .from("patients")
      .delete()
      .eq("id", patient_id);

    if (deletePatientError) {
      console.error("[admin-delete-user] Error deleting patient:", deletePatientError);
      return new Response(
        JSON.stringify({ error: "Błąd podczas usuwania pacjenta: " + deletePatientError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Delete profile
    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    if (deleteProfileError) {
      console.error("[admin-delete-user] Error deleting profile:", deleteProfileError);
    }

    // 7. Delete user_roles
    const { error: deleteRolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (deleteRolesError) {
      console.error("[admin-delete-user] Error deleting roles:", deleteRolesError);
    }

    // 8. Finally, delete the auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("[admin-delete-user] Error deleting auth user:", deleteAuthError);
      return new Response(
        JSON.stringify({ error: "Błąd podczas usuwania konta: " + deleteAuthError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[admin-delete-user] Successfully deleted user:", userId);

    return new Response(
      JSON.stringify({ success: true, message: "Użytkownik został usunięty" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
    console.error("[admin-delete-user] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
