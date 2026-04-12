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

━━━ PRZYKŁAD REFERENCYJNY (dokładnie taki format jest wymagany) ━━━

NOTATKA WEJŚCIOWA (wizyta kontrolna):
"Kwasowość żołądka trochę się wyrównała. Obciążenie pasożytnicze duże — lamblie, przywry, obleńce — do powtarzania przez 3 lata. Układ nerwowy wymaga wspomagania aminokwasowo. Enzymy trawienne jako wspomaganie. Za mało tlenu w komórkach, żelazo w niedoborze, reakcja na tarczycę bez niedoboru jodu, witamina E w niedoborze. Nerw błędny ogólnie lepiej, wchodzi w dolną granicę normy. Staw kości krzyżowej i kości biodrowej — konflikt, do ustawienia. Na wątrobie się jeszcze blokuje trochę. Drogi żółciowe — tłuszcz do każdego posiłku. Olej lniany 1 łyżka dziennie. Kurkumina liposomalna. Multilac 2x1 sztuka. Śniadania lekkie owocowe i kasze gotowane. Dieta nie restrykcyjna, bez smażonych, słodycze po posiłku. Kolacja: zupy, pasty z fasolki, trochę oleju. Nie pić do posiłku, 30 min przed. Narine zielone 3 miesiące. Assymilator. Artichoke 2x2 sztuki. H 500 raz dziennie. Zdjęcie emocji z psem — Piotrek mieszek."

OCZEKIWANY FORMAT WYJŚCIOWY:

diagnosis_summary:
<h3>📋 Porównanie z poprzednią konsultacją</h3>
<p>W porównaniu do poprzedniej konsultacji widoczna jest poprawa w zakresie zakwaszenia żołądka (zapewne przez suplementację) — funkcja trawienna zaczyna się stabilizować, jednak nadal wymaga wsparcia. Widoczna jest poprawa funkcjonowania nerwu błędnego, jednak nadal znajduje się on na dolnej granicy normy. Tarczyca reaguje wtórnie na stan organizmu, jednak bez niedoboru jodu — poprawa względem poprzedniej konsultacji.</p>
<h3>🦠 Układ pokarmowy i trawienie</h3>
<p>Obecny stan wskazuje na lekkie zaburzenia trawienia oraz zaleganie treści pokarmowej, co może wynikać z osłabionej pracy enzymatycznej i współistniejącego stanu zapalnego błony śluzowej żołądka. Kwasowość żołądka zaczyna się stabilizować, jednak wymaga dalszego wsparcia probiotycznego i enzymatycznego. Zaburzenia trawienia wpływają wtórnie na wchłanianie składników odżywczych, co potęguje istniejące niedobory. Kluczowe jest utrzymanie ciągłości suplementacji i unikanie czynników obciążających żołądek.</p>
<h3>🦠 Obciążenia pasożytnicze i bakteryjne</h3>
<p>W organizmie nadal obecne są obciążenia pasożytnicze (lamblia, przywra, obleńce), które wtórnie wpływają na rozprzestrzenianie się obciążeń bakteryjnych. Aktualnie nie są one w stanie ostrym, jednak wymagają długofalowej strategii eliminacji przez ok. 2–3 lata. Pasożyty negatywnie wpływają na florę jelitową i wchłanianie składników odżywczych. Proces oczyszczania powinien być prowadzony etapowo i systematycznie, bez nadmiernego obciążania organizmu.</p>
<h3>🧠 Układ nerwowy i napięcie organizmu</h3>
<p>Układ nerwowy wykazuje oznaki przeciążenia i wymaga wsparcia aminokwasowego oraz regulacji napięcia. Widoczna jest poprawa funkcjonowania nerwu błędnego, jednak nadal znajduje się on na dolnej granicy normy. Napięcia w ciele, szczególnie w obrębie układu autonomicznego, wpływają na funkcjonowanie narządów wewnętrznych. Praca z nerwem błędnym jest kluczowym elementem terapii.</p>
<h3>🦴 Układ ruchu i napięcia strukturalne</h3>
<p>Występuje konflikt napięciowy w obrębie stawu krzyżowo-biodrowego oraz kości krzyżowej, co może wpływać na funkcjonowanie narządów jamy brzusznej i układu nerwowego. Napięcia strukturalne w tej okolicy mogą wtórnie zaburzać pracę układu pokarmowego poprzez mechaniczne oddziaływanie na nerwy trzewne. Wymaga to terapii manualnej i korekty ustawienia. Bez interwencji napięcia będą narastać i utrudniać regenerację.</p>
<h3>🧬 Gospodarka tlenowa i niedobory</h3>
<p>Widoczny jest niedobór żelaza oraz obniżone natlenienie komórkowe, co przekłada się na ogólne zmęczenie i obniżoną wydolność organizmu. Dodatkowo występuje niedobór witaminy E, co wpływa na regenerację tkanek i funkcjonowanie układu nerwowego. Tarczyca reaguje wtórnie na stan organizmu, jednak bez niedoboru jodu — jest to poprawa względem poprzedniej konsultacji. Uzupełnienie tych niedoborów jest warunkiem koniecznym do prawidłowej regeneracji.</p>
<h3>🫀 Wątroba i drogi żółciowe</h3>
<p>Obserwuje się lekkie zablokowanie pracy wątroby oraz niedostateczną aktywację dróg żółciowych, co wpływa na trawienie tłuszczów i ogólną detoksykację organizmu. Niedostateczna produkcja żółci zaburza wchłanianie witamin rozpuszczalnych w tłuszczach (A, E, K, D). Aktywacja dróg żółciowych wymaga obecności tłuszczu przy każdym posiłku. Wsparcie wątroby preparatami Artichoke jest kluczowe dla poprawy detoksykacji.</p>

dietary_recommendations:
<h3>🥗 ZALECENIA DIETETYCZNE</h3>
<h3>🔥 Ogólne zasady</h3>
<ul><li>Dieta umiarkowana — bez dużych restrykcji, ale z eliminacją produktów silnie obciążających</li><li>Unikać: smażonych potraw (szczególnie frytek), ciężkostrawnych dań, nadmiaru cukru</li><li>Słodycze dopuszczalne okazjonalnie, wyłącznie po posiłku — nie powodują wtedy gwałtownego wzrostu insuliny</li></ul>
<h3>🍳 Wsparcie trawienia</h3>
<ul><li>Każdy posiłek powinien zawierać niewielką ilość tłuszczu — aktywacja żółci</li><li>Olej lniany – 1 łyżka dziennie — wspiera redukcję stanu zapalnego</li><li>Nie pić w trakcie posiłków — najpóźniej 30 min przed jedzeniem (max 1/3 filiżanki jeśli konieczne)</li></ul>
<h3>☀️ Śniadania</h3>
<ul><li>Lekkie, ciepłe lub półpłynne</li><li>Kasze gotowane (jaglana, ryżowa)</li><li>Opcjonalnie owoce — tylko rano</li></ul>
<h3>🌙 Kolacje</h3>
<ul><li>Lekkostrawne, ciepłe</li><li>Zupy, pasty warzywne (np. z fasoli)</li><li>Unikać: owoców i prostych węglowodanów wieczorem</li></ul>
<h3>📌 Dodatkowe zalecenia</h3>
<ul><li>Regularność posiłków</li><li>Ograniczenie fermentujących produktów wieczorem</li></ul>

supplementation_program:
<h3>💊 SUPLEMENTACJA (ROZPISANA NA MIESIĄCE)</h3>
<h3>📅 MIESIĄC 1–3 — Regulacja flory, redukcja obciążeń, wsparcie wątroby</h3>
<p>Celem tego etapu jest poprawa równowagi mikrobioty jelitowej, wspomaganie trawienia i aktywacja wątroby oraz dróg żółciowych. Oczekiwane efekty: poprawa trawienia, zmniejszenie wzdęć, lepsza tolerancja tłuszczów.</p>
<ul>
<li><strong>Narine zielone</strong> – 1x dziennie przez 3 miesiące – probiotyk żołądkowy, odbudowa flory</li>
<li><strong>Multilac</strong> – 2x1 kapsułka dziennie (wprowadzić po skończeniu Narine) – wsparcie mikrobioty jelitowej</li>
<li><strong>Assymilator</strong> – enzymy trawienne do głównych posiłków, szczególnie śniadania – poprawa wchłaniania</li>
<li><strong>Kurkumina liposomalna</strong> – 2 ml 1x dziennie – redukcja stanu zapalnego żołądka</li>
<li><strong>Olej lniany</strong> – 1 łyżka dziennie – wsparcie przeciwzapalne, aktywacja żółci</li>
<li><strong>Artichoke (karczoch)</strong> – 2x1-2 kapsułki dziennie – wsparcie wątroby i produkcji żółci</li>
<li><strong>H 500</strong> – raz dziennie – poprawa natlenienia komórkowego, wsparcie energii</li>
</ul>
<p>➡️ dodatkowo: terapia manualna stawu krzyżowo-biodrowego, praca z nerwem błędnym</p>

supporting_therapies:
<h3>🧘‍♀️ TERAPIE DODATKOWE</h3>
<h3>1. Terapia manualna</h3>
<p>Ustawienie stawu krzyżowo-biodrowego oraz praca z kością krzyżową w celu redukcji konfliktu napięciowego wpływającego na układ pokarmowy i nerwowy. Rozluźnienie napięć trzewnych jest kluczowe dla prawidłowego funkcjonowania narządów jamy brzusznej.</p>
<h3>2. Regulacja układu nerwowego</h3>
<p>Praca z nerwem błędnym (techniki oddechowe, osteopatia) w celu poprawy jego funkcji na dolnej granicy normy. Terapia emocjonalna (redukcja napięcia) — osteopatyczne uwalnianie emocji wspiera stabilizację układu autonomicznego.</p>
<h3>3. Zdjęcie emocji z psem — Piotrek mieszek</h3>
<p>Terapia emocjonalna ukierunkowana na redukcję napięcia w układzie nerwowym i uwolnienie skumulowanego stresu. Praca z emocjami wspiera stabilizację nerwu błędnego i poprawę ogólnego samopoczucia.</p>

━━━ KONIEC PRZYKŁADU ━━━

ZASADY NADRZĘDNE (przestrzegaj bezwzględnie):
1. KOMPLETNOŚĆ — każdy suplement, terapia, zalecenie, produkt, zioło, olej, witamina, probiotyk z notatki MUSI pojawić się w output. Zero pominięć.
2. KAŻDY UKŁAD OSOBNO — każdy układ/organ wzmiankowany w notatce = osobny blok h3. Zawsze rozdzielaj:
   - "Układ pokarmowy i trawienie" (ogólnie)
   - "Obciążenia pasożytnicze i bakteryjne" — ZAWSZE osobna sekcja gdy notatka wspomina pasożyty/bakterie
   - "Układ ruchu i napięcia strukturalne" — stawy, kości, kręgosłup, napięcia mięśniowe
   - "Gospodarka tlenowa i niedobory" — tlen, żelazo, witaminy
   - "Wątroba i drogi żółciowe" — zawsze osobna gdy wspomniane
   - wątroba, woreczek żółciowy, nerki, zatoki, płuca, skóra, układ rozrodczy, nerwy sympatyczne → osobne bloki
   ZAKAZ: NIE dodawaj sekcji których nie ma w notatce.
3. ORYGINALNE NAZWY — zachowaj dosłownie: nazwy preparatów, dawkowania z notatki.
4. FOLLOW-UP — jeśli wizyta kontrolna, PIERWSZYM akapitem jest porównanie: co się poprawiło, co wymaga dalszej pracy.
5. STYL KLINICZNY — każdy blok diagnozy: minimum 4 zdania (mechanizm, przyczyna, powiązania, skutki dla pacjenta).
6. ROZPOZNANIE TERAPII — "do ustawienia X", "masaż X", "drenaż X", "praca z nerwem", "zdjęcie emocji", "osteopatia", "limfodrenaż", "komora tlenowa" = TERAPIA (nie suplement).
7. SUPLEMENTY — każdy z notatki jako osobny <li> z dawkowaniem: Multilac, Narine, Assymilator, kurkumina liposomalna, Zaferan, Ginerra, olej lniany, Artichoke, H 500, Iron/żelazo, witaminy (A+E, D, C, B12), Omega-3, Tauryna, Griffonia, Lax-Max, Pau darco, Parafight, srebro koloidalne, Koenzym Q10, Oceanmin, FanDetox — WSZYSTKIE jako osobne <li>.

━━━ SEKCJA 1: diagnosis_summary ━━━
Jeśli wizyta kontrolna: zacznij od bloku "📋 Porównanie z poprzednią konsultacją".
Dla każdego układu z notatki — osobny blok h3 z minimum 4 zdaniami klinicznymi.
Używaj nazw sekcji jak w przykładzie referencyjnym (np. "Układ pokarmowy i trawienie", "Obciążenia pasożytnicze i bakteryjne", "Układ ruchu i napięcia strukturalne", "Gospodarka tlenowa i niedobory", "Wątroba i drogi żółciowe").

━━━ SEKCJA 2: dietary_recommendations ━━━
KLUCZOWE: Twórz subsections WYŁĄCZNIE z tego co jest w notatce. Używaj nazw pasujących do treści:
- "Ogólne zasady" — ogólne wytyczne
- "Wsparcie trawienia" — żółć, płyny, tłuszcze, enzymy
- "Śniadania" — jeśli notatka specyfikuje śniadania
- "Kolacje" — jeśli notatka specyfikuje kolacje
- "Dodatkowe zalecenia" — inne zasady
- "Etap N" — jeśli notatka ma wyraźne fazy miesięczne
NIE stosuj fixed template (Schemat dnia / Eliminacje / Produkty wskazane / Napoje) jeśli notatka nie ma takiej struktury.
Jeśli notatka ma etapy (Etap 1/2/3) → osobny blok na każdy etap.

━━━ SEKCJA 3: supplementation_program ━━━
KRYTYCZNE: KAŻDY suplement z notatki musi być wymieniony jako osobny <li> z dawkowaniem.
MIESIĄCE: Jeśli notatka mówi "3 miesiące" bez podziału → jeden blok "MIESIĄC 1–3". Rozbijaj na osobne miesiące TYLKO gdy notatka wyraźnie różnicuje ("w pierwszym miesiącu X, w drugim Y").

<h3>💊 SUPLEMENTACJA (ROZPISANA NA MIESIĄCE)</h3>
<h3>📅 MIESIĄC [X lub X–Y] — [cel etapu]</h3>
<p>Co ma się wydarzyć w organizmie, czego się spodziewać. 2-3 zdania.</p>
<ul>
<li><strong>[Nazwa z notatki]</strong> – [dawkowanie z notatki] – [uzasadnienie]</li>
</ul>
<p>➡️ dodatkowo: [z notatki]</p>

━━━ SEKCJA 4: supporting_therapies ━━━
Wszystkie terapie z notatki — numerowane bloki jak w przykładzie. Grupuj powiązane działania razem (np. wszystkie terapie manualne jako "1. Terapia manualna" z sub-opisem).

<h3>🧘‍♀️ TERAPIE DODATKOWE</h3>
<h3>[N]. [Nazwa terapii]</h3>
<p>Cel, dlaczego ważna, czego pacjent może się spodziewać. Min. 2-3 zdania.</p>

━━━ WERYFIKACJA PRZED JSON ━━━
□ Czy "Obciążenia pasożytnicze" są osobną sekcją (gdy wspomniane w notatce)?
□ Czy każdy suplement z notatki ma własny <li>?
□ Czy miesiące nie są sztucznie rozbite gdy notatka tego nie wskazuje?
□ Czy terapie manualne i emocjonalne mają swoje bloki?

Odpowiedź zwróć jako poprawny JSON z 4 kluczami: diagnosis_summary, dietary_recommendations, supplementation_program, supporting_therapies.
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
