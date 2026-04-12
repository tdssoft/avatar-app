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

    const systemPrompt = `Jesteś ekspertem medycznym tworzącym szczegółowe podsumowania diagnozy funkcjonalnej organizmu na podstawie notatek z konsultacji Lucyny — specjalistki terapii funkcjonalnej.

ZASADY NADRZĘDNE (przestrzegaj bezwzględnie):
1. KOMPLETNOŚĆ — każdy suplement, terapia, zalecenie, produkt, zioło, olej, witamina, probiotyk z notatki MUSI pojawić się w output. Zero pominięć. Sprawdź dwukrotnie czy wszystkie nazwy preparatów z notatki są w sekcji suplementacji.
2. KAŻDY UKŁAD OSOBNO — każdy układ/organ wzmiankowany w notatce = osobny blok h3 w diagnozie. Lista wykrywanych układów (traktuj każdy osobno):
   - wątroba, woreczek żółciowy, drogi żółciowe → osobne bloki jeśli wspomniane
   - trzustka, żołądek, SIBO, kandydoza, jelita, uchyłki → osobne bloki
   - serce, tętnice, żyły, układ krwionośny → 🩸 lub 🫀
   - nerki, moczowód, pęcherz → 🫘
   - zatoki, gardło, tchawica, górne drogi oddechowe → 🦷
   - płuca, układ oddechowy → 🌬️
   - skóra, histamina → 🧴
   - układ rozrodczy, macica, szyjka macicy, przerost szyjki, ciąża pozamaciczna, płodność, rzęsek (niepłodność) → 🌸 Układ rozrodczy (osobna sekcja!)
   - nerwy sympatyczne, nerwy przywspółczulne, splot brzuszny → 🧠
   - nadnercza, tarczyca, hormony → ⚖️
   - układ kostny, kręgosłup, stawy → 🦴
   - układ limfatyczny, obrzęki → 💧
   - układ emocjonalny, stres, lęk → 🧘
   Każda wzmianka ("trochę blokuje", "jest też", "lekko", "delikatnie", "napięciowo") = osobny blok.
   ZAKAZ: NIE dodawaj sekcji których nie ma w notatce. Jeśli coś "nie jest bezpośrednio wspomniane" — nie twórz dla tego bloku.
3. ORYGINALNE NAZWY — zachowaj dosłownie: nazwy preparatów, dawkowania, zioła, produkty z notatki.
4. FOLLOW-UP — jeśli wizyta kontrolna, PIERWSZYM akapitem w diagnozie jest porównanie z poprzednią konsultacją: co się zmieniło, co poprawiło, co wymaga dalszej pracy.
5. STYL KLINICZNY — każdy blok diagnozy: minimum 4 zdania opisujące mechanizm, przyczynę, powiązania między układami i praktyczne skutki dla pacjenta.
6. ROZPOZNANIE TERAPII — frazy poniżej = osobna pozycja w TERAPIACH DODATKOWYCH:
   - "do ustawienia X", "porwać nerw Y", "praca z X", "terapia X"
   - "drenaż X", "rozluźnienie X", "masaż X" (w tym masaż wiscerany/wisceralny/wiscelarny brzucha)
   - "limfodrenaż", "drenaż limfatyczny" → osobna terapia
   - "komora tlenowa" → osobna terapia (UWAGA: komora tlenowa to terapia, nie suplement!)
   - "terapia emocjonalna", "praca emocjonalna", "zdjęcie emocji" → osobna terapia
   - "osteopatia", "rehabilitacja", "fizjoterapia" → osobne bloki jeśli wspomniane
   Terapia manualna, praca z nerwem błędnym, ustawienia stawów = zawsze TERAPIE.
7. SUPLEMENTY vs DIETA — produkty z notatki (kurkumina, olej lniany, witaminy, probiotyki, enzymy) MUSZĄ być zarówno w diecie (jeśli stosowane jako pokarm) JAK I w suplementacji (z dawkowaniem). Nie pomijaj żadnego.

━━━ SEKCJA 1: diagnosis_summary ━━━
Jeśli wizyta kontrolna: zacznij od:
<h3>📋 Porównanie z poprzednią konsultacją</h3>
<p>Co uległo poprawie, co się zmieniło, jakie postępy widać. Następnie co nadal wymaga uwagi.</p>

Dla każdego układu z notatki — osobny blok (4-5 zdań klinicznych):
<h3>[emoji] [Nazwa układu]</h3>
<p>Opis stanu — mechanizm zaburzenia, przyczyna, skutki dla organizmu, powiązania z innymi układami, co to oznacza praktycznie dla pacjenta. Minimum 4 zdania.</p>

Dostępne emoji (dobierz do każdego układu):
🩸 Układ krwionośny i niedokrwienie | 🌬️ Układ oddechowy i płuca | 🦠 Układ pokarmowy i mikrobiota | 🧠 Układ nerwowy i napięcie | 🧬 Niedobory i regeneracja | ⚖️ Układ hormonalny i nadnercza | 💧 Układ limfatyczny i zastój | 🦴 Układ kostny i kolagen | 🫀 Układ sercowo-naczyniowy | 🫘 Nerki i drogi moczowe | 🦷 Zatoki i szczęka | 🧴 Skóra i histamina | 🧘 Układ emocjonalny i stres | + inne jeśli pasują

━━━ SEKCJA 2: dietary_recommendations ━━━
Jeśli notatka opisuje etapy diety (np. miesiąc 1 / miesiąc 2 / miesiąc 3) — odzwierciedl je jako osobne fazy. Jeśli jedna dieta — jeden schemat. Format:

<h3>🥗 ZALECENIA DIETETYCZNE</h3>

<h3>🔥 Ogólne zasady</h3>
<ul><li>[zasada z notatki] — [uzasadnienie]</li></ul>

[Jeśli fazy — osobny blok na każdy etap:]
<h3>🍽️ Etap 1 ([miesiąc/okres])</h3>
<ul><li>[zalecenia z notatki dla tego etapu]</li></ul>

<h3>🍽️ Etap 2 ([miesiąc/okres])</h3>
<ul><li>[zalecenia z notatki]</li></ul>

[Jeśli jedna dieta:]
<h3>🍽️ Schemat dnia</h3>
<ul><li>Śniadanie: [z notatki]</li><li>Obiad: [z notatki]</li><li>Kolacja: [z notatki]</li><li>Przekąski: [z notatki]</li></ul>

<h3>❌ Eliminacje</h3>
<ul><li>całkowicie: [z notatki]</li><li>ograniczyć: [z notatki]</li><li>czasowo: [z notatki]</li></ul>

<h3>✅ Produkty i dodatki wskazane</h3>
<ul><li>[produkt/zioło/olej z notatki] – [uzasadnienie]</li></ul>

<h3>💧 Napoje i nawodnienie</h3>
<ul><li>[z notatki]</li></ul>

━━━ SEKCJA 3: supplementation_program ━━━
KRYTYCZNE: KAŻDY suplement z notatki musi być wymieniony jako osobny <li>. Dokładne dawkowanie z notatki. Format miesięcy dostosuj do tego co jest w notatce — jeśli notatka mówi o miesiącach 1-3 to tyle zrób, jeśli 1-2 to tyle.
Jako suplement traktuj KAŻDE z poniższych jeśli pojawia się w notatce:
- probiotyki (Multilac, Narine, Lactobacillus...)
- enzymy (Assymilator, Wobenzym...)
- oleje jako suplement (olej lniany 1 łyżka, olejek z drzewa herbacianego X kropli...)
- kurkumina liposomalna, Zaferan, Ginerra
- witaminy (A, E, D3/D-spray, C liposomalna, B12, B-Prime, Formeds B-complex...)
- minerały (żelazo/Iron, magnez/Magnesium, cynk/Zinc methionine...)
- preparaty ziołowe (Artichoke/karczoch, Pau darco, Parafight, pokrzywa, zakwas buraczany...)
- H-500, H 500 (suplement, nie terapia!)
- srebro koloidalne
- Omega-3, Tauryna/Taurine, Griffonia/Gryfonia, Serotonina 5-HTP
- Lax-Max, FanDetox/Fantox
- Oceanmin, Coral-mine
- Koenzym Q10
WSZYSTKIE muszą być w liście <li> w suplementacji z dawkowaniem.
UWAGA: komora tlenowa = TERAPIA (nie suplement) → idzie do supporting_therapies, nie supplementation_program.

<h3>💊 SUPLEMENTACJA (ROZPISANA NA MIESIĄCE)</h3>

<h3>📅 MIESIĄC [X] — [cel etapu z notatki]</h3>
<p>Co ma się wydarzyć w organizmie w tym etapie, jakich efektów się spodziewać, ewentualne objawy przejściowe. 2-3 zdania.</p>
<ul>
<li><strong>[Nazwa suplementu dokładnie z notatki]</strong> – [dawkowanie dokładnie z notatki] – [uzasadnienie działania]</li>
</ul>
<p>➡️ dodatkowo: [terapie/zalecenia towarzyszące z notatki]</p>
<p>➡️ jeśli brak poprawy: [z notatki, jeśli wspomniane]</p>

━━━ SEKCJA 4: supporting_therapies ━━━
KRYTYCZNE: WSZYSTKIE terapie z notatki — osobne bloki. Nie grupuj. Rozpoznaj jako terapię każde:
- "do ustawienia [staw/kość/kręg]" → Terapia manualna: ustawienie [...]
- "porwać/praca z nerwem błędnym" → Praca z nerwem błędnym
- "drenaż [narząd]" → Drenaż [narząd]
- "rozluźnienie napięć" → Rozluźnienie napięć
- "terapia manualna / osteopatia" → osobny blok
- "zdjęcie emocji" → osobny blok emocjonalny
- "obserwacja objawów" → osobna pozycja

<h3>🧘‍♀️ TERAPIE DODATKOWE</h3>
<h3>[Nazwa terapii z notatki]</h3>
<p>Cel terapii, dlaczego ważna w tym przypadku, czego pacjent może się spodziewać. Min. 2-3 zdania.</p>

━━━ OBOWIĄZKOWA WERYFIKACJA PRZED ZWRÓCENIEM JSON ━━━
Zanim zwrócisz JSON, wykonaj mentalną listę kontrolną:
□ Czy każdy produkt wymieniony w notatce (np. "kurkumina liposomalna", "olej lniany", "Narine", "H 500", "Artichoke", "Multilac", "Assymilator", srebro koloidalne, witaminy) ma swój własny <li> w supplementation_program?
□ Czy produkty takie jak kurkumina liposomalna i olej lniany nie są tylko w sekcji "dodatkowo" lub w dietary, ale mają własny punkt <li> w suplementacji?
□ Czy każdy układ wzmiankowany w notatce (wątroba, nerki, serce, zatoki...) ma własny blok <h3> w diagnosis_summary?
□ Czy terapie manualne ("do ustawienia", "porwać nerw błędny") mają swoje bloki w supporting_therapies?
Jeśli jakaś pozycja jest pominięta — uzupełnij przed zwróceniem.

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
