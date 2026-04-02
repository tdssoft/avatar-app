/**
 * generate-interview-draft
 *
 * Triggered fire-and-forget after patient submits nutrition interview.
 * Reads interview content from DB, generates AI recommendation draft,
 * saves to recommendations table with is_draft=true.
 *
 * Auth: patient JWT (any authenticated user who owns the profile)
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

/** Format interview JSON content into a human-readable notes string for AI */
function formatInterviewAsNotes(content: Record<string, unknown>): string {
  const lines: string[] = [];

  const fieldLabels: Record<string, string> = {
    birthDate: "Data urodzenia",
    weight: "Waga",
    height: "Wzrost",
    sex: "Płeć",
    mainComplaints: "Główne dolegliwości",
    chronicDiseases: "Choroby przewlekłe",
    medications: "Przyjmowane leki",
    supplements: "Suplementy",
    allergies: "Alergie",
    dietType: "Typ diety",
    mealsPerDay: "Liczba posiłków dziennie",
    waterIntake: "Spożycie wody",
    physicalActivity: "Aktywność fizyczna",
    sleepHours: "Godziny snu",
    stressLevel: "Poziom stresu",
    smokingStatus: "Palenie tytoniu",
    alcoholConsumption: "Spożycie alkoholu",
    bowelMovements: "Wypróżnienia",
    digestionIssues: "Problemy trawienne",
    energyLevel: "Poziom energii",
    skinCondition: "Stan skóry",
    hairNailCondition: "Stan włosów i paznokci",
    menstrualCycle: "Cykl menstruacyjny",
    goals: "Cele zdrowotne",
    additionalInfo: "Dodatkowe informacje",
  };

  for (const [key, label] of Object.entries(fieldLabels)) {
    const value = content[key];
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      lines.push(`${label}: ${value.join(", ")}`);
    } else if (typeof value === "object") {
      // frequency fields: { value: string, note: string }
      const freq = value as { value?: string; note?: string };
      const parts = [freq.value, freq.note].filter(Boolean);
      if (parts.length > 0) {
        lines.push(`${label}: ${parts.join(" — ")}`);
      }
    } else {
      lines.push(`${label}: ${value}`);
    }
  }

  return lines.join("\n");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      console.error("[generate-interview-draft] Missing OPENAI_API_KEY");
      return jsonResponse(500, { error: "Brak konfiguracji OPENAI_API_KEY" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify patient auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse(401, { error: "Brak autoryzacji" });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return jsonResponse(401, { error: "Nieprawidłowy token" });
    }

    const { profile_id }: { profile_id: string } = await req.json();
    if (!profile_id) {
      return jsonResponse(400, { error: "Wymagane: profile_id" });
    }

    // Verify patient owns this profile
    const { data: profileRow } = await supabase
      .from("person_profiles")
      .select("id, name, account_user_id")
      .eq("id", profile_id)
      .eq("account_user_id", user.id)
      .maybeSingle();

    if (!profileRow) {
      return jsonResponse(403, { error: "Brak dostępu do profilu" });
    }

    // Get patient_id
    const { data: patientRow } = await supabase
      .from("patients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!patientRow) {
      return jsonResponse(404, { error: "Nie znaleziono pacjenta" });
    }

    // Get interview content
    const { data: interview } = await supabase
      .from("nutrition_interviews")
      .select("content, status")
      .eq("person_profile_id", profile_id)
      .eq("status", "sent")
      .order("last_updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!interview?.content) {
      return jsonResponse(404, { error: "Nie znaleziono wysłanego wywiadu" });
    }

    // Check if draft already exists (avoid duplicates)
    const { data: existingDraft } = await supabase
      .from("recommendations")
      .select("id")
      .eq("patient_id", patientRow.id)
      .eq("person_profile_id", profile_id)
      .eq("is_draft", true)
      .maybeSingle();

    if (existingDraft) {
      console.log("[generate-interview-draft] Draft already exists, skipping");
      return jsonResponse(200, { message: "Draft już istnieje", draft_id: existingDraft.id });
    }

    // Format interview as notes
    const notes = formatInterviewAsNotes(interview.content as Record<string, unknown>);
    if (!notes || notes.trim() === "") {
      return jsonResponse(400, { error: "Wywiad jest pusty — brak danych do przetworzenia" });
    }

    const patientName = profileRow.name ?? "";

    const systemPrompt = `Jesteś ekspertem od funkcjonowania ludzkiego organizmu przygotowującym zalecenia dla klientów centrum zdrowia AVATAR.
Na podstawie danych z wywiadu dietetycznego wygeneruj odpowiedź jako poprawny JSON z 4 kluczami: diagnosis_summary, dietary_recommendations, supplementation_program, supporting_therapies.
Każde pole zawiera sformatowany HTML (używaj <p>, <strong>, <h3>, <ul><li>).

diagnosis_summary:
- Każdy temat to osobny akapit z tytułem <h3>
- NIE używaj słów "diagnoza medyczna" ani "diagnostyka" — używaj "podsumowanie funkcjonowania organizmu"

dietary_recommendations:
- Konkretne produkty do włączenia i wykluczenia
- Używaj <ul><li> dla list

supplementation_program:
- Rozpisany na miesiące: <h3>Miesiąc 1</h3>, <h3>Miesiąc 2</h3>, <h3>Miesiąc 3+</h3>
- Używaj produktów firmy Coral Club: H-500, Coral-Mine, Super-Flora, Digest, Coral Lecithin, Spirulina, C-Max, MSM, CoQ10

supporting_therapies:
- Tylko jeśli wskazane w danych wywiadu
- Może być pusty string ""

To jest wstępny szkic (DRAFT) przygotowany automatycznie. Admin przejrzy i zatwierdzi przed wysłaniem do klienta.
Odpowiadaj WYŁĄCZNIE po polsku. Zwróć TYLKO poprawny JSON bez żadnego tekstu poza nim.`;

    const userMessage = [
      patientName ? `Klient: ${patientName}` : null,
      `Typ konsultacji: pierwsza wizyta`,
      `Dane z wywiadu dietetycznego:\n${notes}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Call OpenAI (try gpt-4.5 first, then gpt-4o)
    const models = ["gpt-4.5", "gpt-4o"];
    let result: {
      diagnosis_summary: string;
      dietary_recommendations: string;
      supplementation_program: string;
      supporting_therapies: string;
    } | null = null;

    for (const model of models) {
      try {
        console.log(`[generate-interview-draft] Trying model: ${model}`);
        const openAiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });

        if (!openAiResponse.ok) {
          const errorBody = await openAiResponse.text();
          console.error(`[generate-interview-draft] OpenAI error (${model}):`, errorBody);
          if (openAiResponse.status === 404 || openAiResponse.status === 400) continue;
          throw new Error(`Błąd OpenAI (${openAiResponse.status}): ${errorBody}`);
        }

        const openAiData = await openAiResponse.json();
        const content = openAiData.choices?.[0]?.message?.content;
        if (!content) throw new Error("Brak treści w odpowiedzi OpenAI");

        result = JSON.parse(content);
        console.log(`[generate-interview-draft] Generated with model: ${model}`);
        break;
      } catch (err) {
        if (err instanceof SyntaxError) {
          throw new Error("Nieprawidłowy JSON w odpowiedzi AI");
        }
        console.warn(`[generate-interview-draft] Model ${model} failed, trying next`);
      }
    }

    if (!result) {
      return jsonResponse(500, { error: "Nie udało się wygenerować szkicu AI" });
    }

    // Save draft to recommendations (is_draft=true, created_by_admin_id=null)
    const { data: draft, error: insertError } = await supabase
      .from("recommendations")
      .insert({
        patient_id: patientRow.id,
        person_profile_id: profile_id,
        created_by_admin_id: null,
        recommendation_date: new Date().toISOString().slice(0, 10),
        title: `[SZKIC AI] ${new Date().toLocaleDateString("pl-PL")} — ${patientName}`,
        diagnosis_summary: result.diagnosis_summary || "",
        dietary_recommendations: result.dietary_recommendations || "",
        supplementation_program: result.supplementation_program || "",
        supporting_therapies: result.supporting_therapies || "",
        is_draft: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[generate-interview-draft] Insert error:", insertError);
      return jsonResponse(500, { error: "Nie udało się zapisać szkicu" });
    }

    console.log(`[generate-interview-draft] Draft saved: ${draft.id}`);
    return jsonResponse(200, { success: true, draft_id: draft.id });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Nieznany błąd";
    console.error("[generate-interview-draft] Error:", msg);
    return jsonResponse(500, { error: msg });
  }
});
