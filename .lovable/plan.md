
# Plan: Edycja zaleceń + powiadomienie emailowe po każdej zmianie

## Cel
1. Umożliwić edycję już wysłanych zaleceń (nie tylko roboczych)
2. Po każdym zapisaniu edycji wysyłać email do pacjenta z informacją o aktualizacji
3. Test E2E aby sprawdzić czy wszystko działa poprawnie

---

## Część 1: Nowa trasa dla edycji

### Plik: `src/App.tsx`

Dodanie nowej trasy:
```tsx
<Route path="/admin/patient/:id/recommendation/:recommendationId/edit" element={<RecommendationCreator />} />
```

---

## Część 2: Rozbudowa RecommendationCreator

### Plik: `src/pages/admin/RecommendationCreator.tsx`

| Zmiana | Opis |
|--------|------|
| Nowy parametr URL | Pobranie `recommendationId` z URL (jeśli istnieje = tryb edycji) |
| Ładowanie danych | Pobranie istniejącego zalecenia z bazy przy edycji |
| Logika zapisu | `insert` dla nowych, `update` dla istniejących |
| Email | Zawsze wysyłanie emaila po zapisie (z informacją o aktualizacji) |
| UI | Zmiana tytułu strony na "Edycja zalecenia" w trybie edycji |

#### Nowy flow:

```text
┌─────────────────────────────────────────────────────┐
│  RecommendationCreator                              │
├─────────────────────────────────────────────────────┤
│  URL: /admin/patient/:id/recommendation/new         │
│       → Tryb tworzenia (INSERT)                     │
│                                                     │
│  URL: /admin/patient/:id/recommendation/:recId/edit │
│       → Tryb edycji (UPDATE)                        │
│       → Załaduj istniejące dane                     │
│       → Wyświetl formularz z wartościami            │
└─────────────────────────────────────────────────────┘
```

#### Zmiany w kodzie:

1. **Parametry URL:**
```tsx
const { id, recommendationId } = useParams<{ id: string; recommendationId?: string }>();
const isEditMode = !!recommendationId;
```

2. **Ładowanie danych (nowy useEffect):**
```tsx
useEffect(() => {
  if (isEditMode && recommendationId) {
    fetchExistingRecommendation(recommendationId);
  }
}, [recommendationId]);

const fetchExistingRecommendation = async (recId: string) => {
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("id", recId)
    .single();
  
  if (data) {
    setFormData({
      title: data.title || "",
      diagnosisSummary: data.diagnosis_summary || "",
      dietaryRecommendations: data.dietary_recommendations || "",
      supplementationProgram: data.supplementation_program || "",
      shopLinks: data.shop_links || "",
      supportingTherapies: data.supporting_therapies || "",
      tags: data.tags || [],
    });
    setSelectedSystems(data.body_systems || []);
    setSelectedProfileId(data.person_profile_id || "");
  }
};
```

3. **Logika zapisu (modyfikacja handleSubmit):**
```tsx
const handleSubmit = async () => {
  // ... walidacja ...
  
  let recommendation;
  
  if (isEditMode && recommendationId) {
    // UPDATE - edycja istniejącego
    const { data, error } = await supabase
      .from("recommendations")
      .update({
        body_systems: selectedSystems,
        title: formData.title || null,
        diagnosis_summary: formData.diagnosisSummary || null,
        // ... reszta pól ...
        updated_at: new Date().toISOString(),
      })
      .eq("id", recommendationId)
      .select("id")
      .single();
    
    recommendation = data;
    toast.success("Zalecenie zostało zaktualizowane");
  } else {
    // INSERT - nowe zalecenie
    const { data, error } = await supabase
      .from("recommendations")
      .insert({ /* ... */ })
      .select("id")
      .single();
    
    recommendation = data;
    toast.success("Zalecenie zostało utworzone");
  }
  
  // Zawsze wyślij email po zapisie
  if (sendEmail && recommendation) {
    await sendNotificationEmail(recommendation.id, isEditMode);
  }
};
```

---

## Część 3: Rozbudowa Edge Function dla emaila

### Plik: `supabase/functions/send-recommendation-email/index.ts`

Dodanie parametru `is_update` do żądania, aby zmienić treść emaila:

| Parametr | Opis |
|----------|------|
| `recommendation_id` | ID zalecenia |
| `is_update` | `true` = aktualizacja, `false` = nowe |

#### Zmiany w treści emaila:

**Dla nowego zalecenia:**
- Tytuł: "Nowe zalecenie dla [profil] - AVATAR"
- Treść: "Przygotowaliśmy dla Ciebie nowe zalecenia..."

**Dla aktualizacji:**
- Tytuł: "Zaktualizowane zalecenie dla [profil] - AVATAR"
- Treść: "Twoje zalecenia zostały zaktualizowane..."

---

## Część 4: Przycisk "Edytuj" w PatientProfile

### Plik: `src/pages/admin/PatientProfile.tsx`

Dodanie przycisku edycji obok każdego zalecenia (linie ~523-543):

```tsx
<div className="flex gap-2">
  {/* Nowy przycisk edycji */}
  <Button
    variant="outline"
    size="sm"
    onClick={() => navigate(`/admin/patient/${id}/recommendation/${rec.id}/edit`)}
    className="gap-1"
  >
    <Pencil className="h-4 w-4" />
    Edytuj
  </Button>
  
  {/* Istniejące przyciski */}
  {tokenExpired && (
    <Button variant="outline" size="sm" onClick={() => handleRegenerateToken(rec.id)}>
      <RefreshCw className="h-4 w-4" />
      Odnów token
    </Button>
  )}
  {rec.pdf_url && (
    <Button variant="outline" size="sm" asChild>
      <a href={rec.pdf_url}>Pobierz PDF</a>
    </Button>
  )}
</div>
```

---

## Część 5: Test E2E

Po implementacji wykonam test end-to-end:

1. Otwarcie przeglądarki automatycznej
2. Nawigacja do panelu admina
3. Wejście w profil pacjenta
4. Utworzenie nowego zalecenia
5. Powrót do listy i kliknięcie "Edytuj"
6. Zmiana treści zalecenia
7. Zapisanie z włączonym emailem
8. Weryfikacja logów edge function
9. Sprawdzenie czy email został wysłany

---

## Podsumowanie plików do modyfikacji

| Plik | Akcja |
|------|-------|
| `src/App.tsx` | Dodanie trasy edycji |
| `src/pages/admin/RecommendationCreator.tsx` | Tryb edycji + update |
| `src/pages/admin/PatientProfile.tsx` | Przycisk "Edytuj" |
| `supabase/functions/send-recommendation-email/index.ts` | Obsługa `is_update` |

---

## Rezultat końcowy

Po wdrożeniu:
- Admin może edytować KAŻDE zalecenie (nie tylko robocze)
- Po każdym zapisie (nowe lub edycja) wysyłany jest email do pacjenta
- Email informuje czy to nowe zalecenie czy aktualizacja
- Pełna historia edycji (dzięki `updated_at` w bazie)
