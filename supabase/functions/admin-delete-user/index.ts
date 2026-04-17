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

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

    const { data: personProfiles, error: personProfilesReadError } = await supabaseAdmin
      .from("person_profiles")
      .select("id, avatar_url")
      .eq("account_user_id", userId);

    if (personProfilesReadError) {
      console.error("[admin-delete-user] Error loading person profiles:", personProfilesReadError);
    }

    const personProfileIds = (personProfiles || []).map((profile) => profile.id);

    // Delete storage files linked to patient result files
    const { data: patientResultFiles } = await supabaseAdmin
      .from("patient_result_files")
      .select("file_path")
      .eq("patient_id", patient_id);

    if (patientResultFiles && patientResultFiles.length > 0) {
      const filePaths = patientResultFiles.map((r) => r.file_path);
      const { error: storageError } = await supabaseAdmin.storage
        .from("patient-result-files")
        .remove(filePaths);
      if (storageError) {
        console.error("[admin-delete-user] Error deleting patient-result-files:", storageError);
      }
    }

    // Delete storage files linked to patient device files
    const { data: patientDeviceFiles } = await supabaseAdmin
      .from("patient_device_files")
      .select("file_path")
      .eq("patient_id", patient_id);

    if (patientDeviceFiles && patientDeviceFiles.length > 0) {
      const filePaths = patientDeviceFiles.map((r) => r.file_path);
      const { error: storageError } = await supabaseAdmin.storage
        .from("patient-device-files")
        .remove(filePaths);
      if (storageError) {
        console.error("[admin-delete-user] Error deleting patient-device-files:", storageError);
      }
    }

    // Delete storage files linked to patient AI entries
    const { data: patientAiFiles } = await supabaseAdmin
      .from("patient_ai_entries")
      .select("attachment_file_path")
      .eq("patient_id", patient_id)
      .not("attachment_file_path", "is", null);

    if (patientAiFiles && patientAiFiles.length > 0) {
      const filePaths = patientAiFiles
        .map((r) => r.attachment_file_path)
        .filter((path): path is string => typeof path === "string" && path.length > 0);
      if (filePaths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from("patient-ai-files")
          .remove(filePaths);
        if (storageError) {
          console.error("[admin-delete-user] Error deleting patient-ai-files:", storageError);
        }
      }
    }

    // Delete audio recordings files from storage
    const { data: audioRecordings } = await supabaseAdmin
      .from("audio_recordings")
      .select("file_path")
      .eq("recorded_by", userId);

    if (audioRecordings && audioRecordings.length > 0) {
      const filePaths = audioRecordings.map((r) => r.file_path);
      const { error: storageError } = await supabaseAdmin.storage
        .from("audio-recordings")
        .remove(filePaths);
      if (storageError) {
        console.error("[admin-delete-user] Error deleting audio-recordings storage files:", storageError);
      }
    }

    // Delete legacy user results files from storage
    const { data: userResults } = await supabaseAdmin
      .from("user_results")
      .select("file_path")
      .eq("user_id", userId);

    if (userResults && userResults.length > 0) {
      const filePaths = userResults.map((r) => r.file_path);
      const { error: storageError } = await supabaseAdmin.storage
        .from("results")
        .remove(filePaths);
      if (storageError) {
        console.error("[admin-delete-user] Error deleting legacy result files:", storageError);
      }
    }

    // Delete person-profile avatars from storage
    const avatarPaths = (personProfiles || [])
      .map((profile) => {
        const avatarUrl = profile.avatar_url;
        if (!avatarUrl) return null;
        const marker = "/storage/v1/object/public/avatars/";
        const idx = avatarUrl.indexOf(marker);
        if (idx === -1) return null;
        return avatarUrl.slice(idx + marker.length).split("?")[0];
      })
      .filter((path): path is string => Boolean(path));

    if (avatarPaths.length > 0) {
      const { error: avatarStorageError } = await supabaseAdmin.storage
        .from("avatars")
        .remove(avatarPaths);
      if (avatarStorageError) {
        console.error("[admin-delete-user] Error deleting person avatar files:", avatarStorageError);
      }
    }

    // Delete linked rows not fully covered by cascades from auth user deletion
    if (personProfileIds.length > 0) {
      await supabaseAdmin.from("profile_access").delete().in("person_profile_id", personProfileIds);
      await supabaseAdmin.from("nutrition_interviews").delete().in("person_profile_id", personProfileIds);
      await supabaseAdmin.from("audio_recordings").delete().in("person_profile_id", personProfileIds);
    }

    await supabaseAdmin.from("patient_ai_entries").delete().eq("patient_id", patient_id);
    await supabaseAdmin.from("patient_device_files").delete().eq("patient_id", patient_id);
    await supabaseAdmin.from("patient_result_files").delete().eq("patient_id", patient_id);
    await supabaseAdmin.from("patient_messages").delete().eq("patient_id", patient_id);
    await supabaseAdmin.from("patient_notes").delete().eq("patient_id", patient_id);
    await supabaseAdmin.from("recommendations").delete().eq("patient_id", patient_id);
    await supabaseAdmin.from("profile_access").delete().eq("account_user_id", userId);
    await supabaseAdmin.from("partner_shop_links").delete().eq("partner_user_id", userId);
    await supabaseAdmin.from("referrals").delete().eq("referred_user_id", userId);
    await supabaseAdmin.from("referrals").delete().eq("referrer_user_id", userId);

    // Delete person profiles and patient/profile rows
    const { error: personProfilesError } = await supabaseAdmin
      .from("person_profiles")
      .delete()
      .eq("account_user_id", userId);
    if (personProfilesError) {
      console.error("[admin-delete-user] Error deleting person_profiles:", personProfilesError);
    }

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

    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", userId);
    if (deleteProfileError) {
      console.error("[admin-delete-user] Error deleting profile:", deleteProfileError);
    }

    const { error: deleteRolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId);
    if (deleteRolesError) {
      console.error("[admin-delete-user] Error deleting roles:", deleteRolesError);
    }

    // Finally, delete the auth user
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
