import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExportFilters {
  date_from?: string | null;
  date_to?: string | null;
  subscription_status?: string | null;
}

interface ExportRequest {
  fields: string[];
  filters: ExportFilters;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Brak autoryzacji");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Nieprawidłowy token");
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Brak uprawnień administratora");
    }

    const { fields, filters }: ExportRequest = await req.json();

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      throw new Error("Nie wybrano pól do eksportu");
    }

    // Build query for patients with related data
    let query = supabase
      .from("patients")
      .select(`
        id,
        user_id,
        subscription_status,
        diagnosis_status,
        created_at
      `);

    // Apply filters
    if (filters.subscription_status) {
      query = query.eq("subscription_status", filters.subscription_status);
    }

    if (filters.date_from) {
      query = query.gte("created_at", filters.date_from);
    }

    if (filters.date_to) {
      query = query.lte("created_at", filters.date_to + "T23:59:59");
    }

    const { data: patients, error: patientsError } = await query;

    if (patientsError) {
      throw new Error(`Błąd pobierania danych: ${patientsError.message}`);
    }

    if (!patients || patients.length === 0) {
      return new Response(
        JSON.stringify({ csv: "", count: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get all user IDs
    const userIds = patients.map((p) => p.user_id);

    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, phone")
      .in("user_id", userIds);

    const profilesMap = new Map(
      (profiles || []).map((p) => [p.user_id, p])
    );

    // Fetch person profiles
    const { data: personProfiles } = await supabase
      .from("person_profiles")
      .select("account_user_id, name, birth_date, gender, is_primary")
      .in("account_user_id", userIds);

    const personProfilesMap = new Map<string, typeof personProfiles>();
    (personProfiles || []).forEach((pp) => {
      const existing = personProfilesMap.get(pp.account_user_id) || [];
      existing.push(pp);
      personProfilesMap.set(pp.account_user_id, existing);
    });

    // Fetch recommendations count
    const { data: recommendations } = await supabase
      .from("recommendations")
      .select("patient_id, recommendation_date");

    const recsMap = new Map<string, { count: number; lastDate: string | null }>();
    (recommendations || []).forEach((rec) => {
      const existing = recsMap.get(rec.patient_id) || { count: 0, lastDate: null };
      existing.count++;
      if (!existing.lastDate || rec.recommendation_date > existing.lastDate) {
        existing.lastDate = rec.recommendation_date;
      }
      recsMap.set(rec.patient_id, existing);
    });

    // Get emails from auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const emailsMap = new Map(
      authUsers.users.map((u) => [u.id, u.email || ""])
    );

    // Build CSV rows
    const rows: Record<string, string>[] = [];

    for (const patient of patients) {
      const profile = profilesMap.get(patient.user_id);
      const personProfilesList = personProfilesMap.get(patient.user_id) || [];
      const primaryPersonProfile = personProfilesList.find((pp) => pp.is_primary) || personProfilesList[0];
      const recStats = recsMap.get(patient.id) || { count: 0, lastDate: null };

      const row: Record<string, string> = {};

      if (fields.includes("email")) {
        row.email = emailsMap.get(patient.user_id) || "";
      }
      if (fields.includes("first_name")) {
        row.first_name = profile?.first_name || "";
      }
      if (fields.includes("last_name")) {
        row.last_name = profile?.last_name || "";
      }
      if (fields.includes("phone")) {
        row.phone = profile?.phone || "";
      }
      if (fields.includes("profile_name")) {
        row.profile_name = primaryPersonProfile?.name || "";
      }
      if (fields.includes("birth_date")) {
        row.birth_date = primaryPersonProfile?.birth_date || "";
      }
      if (fields.includes("gender")) {
        row.gender = primaryPersonProfile?.gender || "";
      }
      if (fields.includes("subscription_status")) {
        row.subscription_status = patient.subscription_status || "";
      }
      if (fields.includes("diagnosis_status")) {
        row.diagnosis_status = patient.diagnosis_status || "";
      }
      if (fields.includes("created_at")) {
        row.created_at = patient.created_at ? new Date(patient.created_at).toISOString().split("T")[0] : "";
      }
      if (fields.includes("recommendations_count")) {
        row.recommendations_count = recStats.count.toString();
      }
      if (fields.includes("last_recommendation_date")) {
        row.last_recommendation_date = recStats.lastDate || "";
      }

      rows.push(row);
    }

    // Build CSV string
    const fieldLabels: Record<string, string> = {
      email: "Email",
      first_name: "Imię",
      last_name: "Nazwisko",
      phone: "Telefon",
      profile_name: "Nazwa profilu",
      birth_date: "Data urodzenia",
      gender: "Płeć",
      subscription_status: "Status subskrypcji",
      diagnosis_status: "Status diagnozy",
      created_at: "Data rejestracji",
      recommendations_count: "Liczba zaleceń",
      last_recommendation_date: "Data ostatniego zalecenia",
    };

    const csvHeader = fields.map((f) => fieldLabels[f] || f).join(",");
    const csvRows = rows.map((row) =>
      fields.map((f) => `"${(row[f] || "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [csvHeader, ...csvRows].join("\n");

    console.log(`Export completed: ${rows.length} rows`);

    return new Response(
      JSON.stringify({ csv, count: rows.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
    console.error("Error in export-data:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
