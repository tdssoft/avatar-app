import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ImportRow {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  profile_name?: string;
  birth_date?: string;
  gender?: string;
}

interface ImportResult {
  created_accounts: number;
  created_profiles: number;
  updated_records: number;
  errors: Array<{ row: number; message: string }>;
}

// Generate random password
function generatePassword(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  let password = "";
  for (let i = 0; i < 16; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate referral code
function generateReferralCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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

    const { data: importData }: { data: ImportRow[] } = await req.json();

    if (!importData || !Array.isArray(importData)) {
      throw new Error("Nieprawidłowe dane wejściowe");
    }

    const result: ImportResult = {
      created_accounts: 0,
      created_profiles: 0,
      updated_records: 0,
      errors: [],
    };

    for (let i = 0; i < importData.length; i++) {
      const row = importData[i];
      const rowNum = i + 2; // +2 because: +1 for 0-index, +1 for header row

      try {
        // Validate required fields
        if (!row.email || !row.first_name || !row.last_name) {
          result.errors.push({
            row: rowNum,
            message: "Brakuje wymaganych pól (email, imię lub nazwisko)",
          });
          continue;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          result.errors.push({
            row: rowNum,
            message: `Nieprawidłowy format email: ${row.email}`,
          });
          continue;
        }

        // Check if user already exists
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(
          (u) => u.email?.toLowerCase() === row.email.toLowerCase()
        );

        let userId: string;

        if (existingUser) {
          // User exists - update profile if needed
          userId = existingUser.id;

          // Update profile
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              first_name: row.first_name,
              last_name: row.last_name,
              phone: row.phone || null,
            })
            .eq("user_id", userId);

          if (updateError) {
            console.error("Profile update error:", updateError);
          } else {
            result.updated_records++;
          }
        } else {
          // Create new user
          const tempPassword = generatePassword();
          
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: row.email,
            password: tempPassword,
            email_confirm: true,
          });

          if (createError || !newUser.user) {
            result.errors.push({
              row: rowNum,
              message: `Nie udało się utworzyć konta: ${createError?.message || "Unknown error"}`,
            });
            continue;
          }

          userId = newUser.user.id;

          // Create profile
          const { error: profileError } = await supabase.from("profiles").insert({
            user_id: userId,
            first_name: row.first_name,
            last_name: row.last_name,
            phone: row.phone || null,
            referral_code: generateReferralCode(),
          });

          if (profileError) {
            console.error("Profile creation error:", profileError);
          }

          // Create patient record
          const { error: patientError } = await supabase.from("patients").insert({
            user_id: userId,
            subscription_status: "Brak",
            diagnosis_status: "Brak",
          });

          if (patientError) {
            console.error("Patient creation error:", patientError);
          }

          result.created_accounts++;
        }

        // Create or update person profile
        const profileName = row.profile_name || `${row.first_name} ${row.last_name}`;

        // Check if person profile already exists
        const { data: existingProfile } = await supabase
          .from("person_profiles")
          .select("id")
          .eq("account_user_id", userId)
          .eq("name", profileName)
          .maybeSingle();

        if (!existingProfile) {
          // Create new person profile
          const { error: personProfileError } = await supabase
            .from("person_profiles")
            .insert({
              account_user_id: userId,
              name: profileName,
              birth_date: row.birth_date || null,
              gender: row.gender || null,
              is_primary: true, // First imported profile is primary
            });

          if (personProfileError) {
            console.error("Person profile creation error:", personProfileError);
          } else {
            result.created_profiles++;
          }
        }
      } catch (rowError) {
        console.error(`Error processing row ${rowNum}:`, rowError);
        result.errors.push({
          row: rowNum,
          message: rowError instanceof Error ? rowError.message : "Nieznany błąd",
        });
      }
    }

    console.log("Import completed:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
    console.error("Error in import-patients:", errorMessage);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
