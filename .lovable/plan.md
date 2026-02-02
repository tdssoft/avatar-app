
# Plan naprawy strony "Wyniki badań" (/dashboard/results)

## Zdiagnozowany problem

Strona `Results.tsx` jest **statycznym placeholderem** - nie pobiera żadnych danych z bazy danych. Zawiera tylko hardcoded `<SelectItem value="none">Brak zaleceń</SelectItem>`.

Strona `Recommendations.tsx` działa poprawnie, bo:
1. Pobiera `patient.id` na podstawie `user?.id`
2. Pobiera zalecenia z tabeli `recommendations` filtrowane po `patient_id`

## Rozwiązanie

Muszę przebudować `Results.tsx`, aby:
1. Pobierał aktywny profil (Kowal) z kontekstu/localStorage
2. Pobierał zalecenia dla tego profilu z bazy danych
3. Wyświetlał je w dropdown "Zalecenia z dnia"
4. Po wybraniu zalecenia pokazywał szczegóły

## Szczegółowe zmiany w `src/pages/Results.tsx`

### Dodać importy
```typescript
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
```

### Dodać stany i logikę pobierania
```typescript
interface Recommendation {
  id: string;
  title: string | null;
  recommendation_date: string;
  diagnosis_summary: string | null;
}

const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
const [selectedRecommendation, setSelectedRecommendation] = useState<string>("");
const [isLoading, setIsLoading] = useState(true);
const { user } = useAuth();
```

### Funkcja pobierania zaleceń
```typescript
useEffect(() => {
  if (user) {
    fetchRecommendations();
  }
}, [user]);

const fetchRecommendations = async () => {
  setIsLoading(true);
  
  // 1. Pobierz patient_id
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("user_id", user?.id)
    .single();

  if (!patient) {
    setIsLoading(false);
    return;
  }

  // 2. Opcjonalnie: pobierz aktywny profil z localStorage
  const activeProfileId = localStorage.getItem('activeProfileId');

  // 3. Pobierz zalecenia
  let query = supabase
    .from("recommendations")
    .select("id, title, recommendation_date, diagnosis_summary")
    .eq("patient_id", patient.id)
    .order("recommendation_date", { ascending: false });

  // Filtruj po profilu jeśli jest wybrany
  if (activeProfileId) {
    query = query.eq("person_profile_id", activeProfileId);
  }

  const { data } = await query;
  setRecommendations(data || []);
  setIsLoading(false);
};
```

### Zaktualizować dropdown
```tsx
<Select 
  value={selectedRecommendation} 
  onValueChange={setSelectedRecommendation}
>
  <SelectTrigger className="w-[200px] bg-background">
    <SelectValue placeholder="Wybierz zalecenie" />
  </SelectTrigger>
  <SelectContent className="bg-background">
    {recommendations.length === 0 ? (
      <SelectItem value="none" disabled>Brak zaleceń</SelectItem>
    ) : (
      recommendations.map((rec) => (
        <SelectItem key={rec.id} value={rec.id}>
          {format(new Date(rec.recommendation_date), "d MMM yyyy", { locale: pl })}
          {rec.title ? ` - ${rec.title}` : ""}
        </SelectItem>
      ))
    )}
  </SelectContent>
</Select>
```

### Wyświetlić szczegóły wybranego zalecenia
Gdy użytkownik wybierze zalecenie, poniżej wyświetlić jego szczegóły (diagnosis_summary).

## Pliki do modyfikacji

1. `src/pages/Results.tsx` - pełna przebudowa z dodaniem pobierania danych

## Oczekiwany rezultat

Po wejściu na stronę "Wyniki badań" dla profilu Kowal:
- Dropdown pokaże 2 zalecenia (te same co na stronie "Moje zalecenia")
- Użytkownik może wybrać zalecenie z listy
- Po wyborze wyświetlą się szczegóły zalecenia
