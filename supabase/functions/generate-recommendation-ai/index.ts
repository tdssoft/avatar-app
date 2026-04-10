import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateRecommendationRequest {
  notes: string;
  patientName?: string;
  isFollowUp?: boolean;
  previousSummary?: string;
}

interface AIRecommendationResult {
  diagnosis_summary: string;
  dietary_recommendations: string;
  supplementation_program: string;
  supporting_therapies: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiApiKey) {
      throw new Error("Brak konfiguracji OPENAI_API_KEY");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Brak autoryzacji");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Nieprawidłowy token");
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Brak uprawnień administratora");
    }

    const { notes, patientName, isFollowUp = false, previousSummary }: GenerateRecommendationRequest = await req.json();

    if (!notes || notes.trim() === "") {
      throw new Error("Brak notatek do przetworzenia");
    }

    const systemPrompt = `Jesteś ekspertem medycznym opracowującym szczegółowe podsumowanie diagnozy funkcjonalnej organizmu na podstawie notatek z konsultacji.

ZASADA NADRZĘDNA: Każdy suplement, każda terapia i każde zalecenie wymienione w notatce MUSI pojawić się w odpowiedniej sekcji. Nie pomijaj niczego co jest w notatce. Zachowuj oryginalne nazwy preparatów i dawkowania z notatki.

Jeśli to wizyta kontrolna — zacznij diagnosis_summary od akapitu opisującego co się zmieniło od poprzedniej konsultacji.

━━━ SEKCJA 1: diagnosis_summary ━━━
Dla każdego układu wymienionego w notatce utwórz osobny blok. Dobierz emoji z listy:
🩸 Układ krwionośny i niedokrwienie | 🌬️ Układ oddechowy i infekcje | 🦠 Układ pokarmowy i mikrobiota | 🧠 Układ nerwowy i napięcie | 🧬 Niedobory i regeneracja organizmu | ⚖️ Układ hormonalny i rozrodczy | 💧 Układ limfatyczny i zastój | 🦴 Układ kostny i kolagen | 🫀 Układ sercowo-naczyniowy

Format każdego bloku — minimum 3-4 precyzyjne zdania z mechanizmem:
<h3>🩸 Układ krwionośny i niedokrwienie</h3>
<p>OPIS — wyjaśnij mechanizm, przyczynę, skutki dla organizmu, powiązania z innymi układami. Minimum 3-4 zdań.</p>

━━━ SEKCJA 2: dietary_recommendations ━━━
Dieta w kompaktowym stylu — główne założenia jako bullet pointy, szczegóły jako krótkie opisy. Format:

<h3>🥗 ZALECENIA DIETETYCZNE</h3>

<h3>🔥 Główne założenia diety</h3>
<ul><li>[typ diety i cel] — [krótkie uzasadnienie]</li><li>[eliminacje główne] — [dlaczego]</li><li>[wsparcie dla konkretnych problemów z notatki]</li></ul>

<h3>❌ Eliminacje</h3>
<ul><li>całkowicie: [produkty z notatki + wyjaśnienie]</li><li>ograniczyć: [lista]</li><li>czasowo: [lista]</li></ul>

<h3>✅ Produkty wskazane</h3>
<ul><li>[produkt z notatki] – [uzasadnienie]</li></ul>

<h3>🍽️ Schemat dnia</h3>
<ul>
<li>Śniadanie: [z notatki — np. białkowe/węglowodanowe naprzemiennie]</li>
<li>Obiad: [z notatki]</li>
<li>Kolacja: [z notatki]</li>
<li>Przekąski: [z notatki]</li>
</ul>

<h3>💧 Napoje i dodatki</h3>
<ul><li>[z notatki — woda, zioła, oleje, itp.]</li></ul>

━━━ SEKCJA 3: supplementation_program ━━━
KRYTYCZNE: Wszystkie suplementy z notatki MUSZĄ być wymienione. Zachowaj oryginalne nazwy i dawkowania z notatki dosłownie. Przypisz każdy suplement do odpowiedniego miesiąca zgodnie z notatką. Format:

<h3>💊 SUPLEMENTACJA (ROZPISANA NA MIESIĄCE)</h3>

<h3>📅 MIESIĄC 1–2 ([cel etapu z notatki])</h3>
<p>Cel tego etapu — co ma się wydarzyć w organizmie, czego oczekujemy. Min. 2-3 zdania.</p>
<ul>
<li><strong>[Nazwa suplementu z notatki]</strong> – [dawkowanie z notatki] – [krótkie uzasadnienie]</li>
</ul>
<p>➡️ dodatkowo: [terapie lub dodatkowe zalecenia z notatki dla tego etapu, np. komora tlenowa, masaż]</p>

<h3>📅 MIESIĄC 3–4 ([cel etapu])</h3>
<p>Cel...</p>
<ul><li>...</li></ul>
<p>➡️ jeśli brak poprawy: [z notatki co wtedy]</p>

<h3>📅 MIESIĄC 5+ ([cel — długoterminowa odbudowa])</h3>
<p>Długoterminowe wsparcie...</p>
<ul><li>kontynuacja: ...</li><li>dodanie: ...</li></ul>

━━━ SEKCJA 4: supporting_therapies ━━━
KRYTYCZNE: WSZYSTKIE terapie wymienione w notatce muszą pojawić się tutaj jako osobne pozycje. Nie pomijaj żadnej. Format:

<h3>🧘‍♀️ TERAPIE DODATKOWE</h3>
<h3>[Nazwa terapii z notatki]</h3>
<p>Wyjaśnienie — dlaczego ta terapia, co ma osiągnąć, jak ważna w tym przypadku. Min. 2 zdania.</p>

Odpowiedź zwróć jako poprawny JSON z 4 kluczami: diagnosis_summary, dietary_recommendations, supplementation_program, supporting_therapies.
Każde pole zawiera sformatowany HTML zgodnie z powyższymi wzorcami.
Zwróć TYLKO poprawny JSON bez żadnego tekstu poza nim.`;

    const userMessage = [
      patientName ? `Klient: ${patientName}` : null,
      isFollowUp ? "Typ konsultacji: follow-up (wizyta kontrolna)" : "Typ konsultacji: pierwsza wizyta",
      previousSummary ? `Poprzednie podsumowanie:\n${previousSummary}` : null,
      `Notatki z konsultacji:\n${notes}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    // Try gpt-4.5 first, fall back to gpt-4o on model error
    const models = ["gpt-4.5", "gpt-4o"];
    let lastError: Error | null = null;
    let result: AIRecommendationResult | null = null;

    for (const model of models) {
      try {
        console.log(`Trying model: ${model}`);
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
            max_tokens: 8000,
          }),
        });

        if (!openAiResponse.ok) {
          const errorBody = await openAiResponse.text();
          console.error(`OpenAI error with model ${model}:`, errorBody);
          // If model not found, try next
          if (openAiResponse.status === 404 || openAiResponse.status === 400) {
            lastError = new Error(`Model ${model} nie jest dostępny: ${errorBody}`);
            continue;
          }
          throw new Error(`Błąd OpenAI (${openAiResponse.status}): ${errorBody}`);
        }

        const openAiData = await openAiResponse.json();
        const content = openAiData.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("Brak treści w odpowiedzi OpenAI");
        }

        const parsed = JSON.parse(content) as AIRecommendationResult;
        result = parsed;
        console.log(`Successfully generated with model: ${model}`);
        break;
      } catch (err) {
        if (err instanceof SyntaxError) {
          throw new Error("Nieprawidłowy JSON w odpowiedzi AI");
        }
        // If it's a model availability error, try next model
        if (lastError && err === lastError) {
          continue;
        }
        throw err;
      }
    }

    if (!result) {
      throw lastError || new Error("Nie udało się wygenerować zaleceń");
    }

    return new Response(
      JSON.stringify({
        diagnosis_summary: result.diagnosis_summary || "",
        dietary_recommendations: result.dietary_recommendations || "",
        supplementation_program: result.supplementation_program || "",
        supporting_therapies: result.supporting_therapies || "",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
    console.error("Error in generate-recommendation-ai:", errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
